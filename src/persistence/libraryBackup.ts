import { basename } from 'node:path';
import {
  getSafeMidiFilename,
  isSafeSongStorageId,
} from '../lib/storage/storageSafety';
import type {
  LibraryBackup,
  LibraryBackupMidiFile,
  LibraryBackupV1,
  LibraryBackupV2,
  LibraryExportResult,
  LibraryImportResult,
  SongRow,
} from '../shared/dbTypes';
import type { MidiStorageAdapter, MidiStorageStagedFile } from '../storage/midiStorage';
import type { AppDatabase } from './database';
import { computeSongMetadata, createSongId } from '../lib/midi/importMetadata';

const MAX_BACKUP_MIDI_BYTES = 10 * 1024 * 1024;

interface BuildLibraryBackupResult {
  backup: LibraryBackupV2;
  exportResult: Omit<LibraryExportResult, 'filename' | 'target' | 'location'>;
}

function getStoredMidiPath(songId: string, midiStorage: MidiStorageAdapter): string {
  return midiStorage.getPathForSong(songId);
}

function assertBackupMidiFileIsSafe(file: LibraryBackupMidiFile): void {
  if (!isSafeSongStorageId(file.songId)) {
    throw new Error(`Unsafe MIDI backup song id: ${file.songId}.`);
  }
  if (file.filename !== `${file.songId}.mid`) {
    throw new Error(`Invalid MIDI backup filename for ${file.songId}.`);
  }
  if (!Number.isSafeInteger(file.byteLength) || file.byteLength < 0) {
    throw new Error(`Invalid MIDI backup byte length for ${file.songId}.`);
  }
  if (file.byteLength > MAX_BACKUP_MIDI_BYTES) {
    throw new Error(`MIDI backup is larger than the ${MAX_BACKUP_MIDI_BYTES} byte limit for ${file.songId}.`);
  }
}

function decodeBase64(value: string, songId: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Invalid MIDI backup encoding for ${songId}.`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) {
    throw new Error(`Invalid MIDI backup encoding for ${songId}.`);
  }
  return new Uint8Array(bytes);
}

function assertBackupSongIdIsSafe(song: SongRow): void {
  if (!isSafeSongStorageId(song.id)) {
    throw new Error(`Unsafe backup song id: ${song.id}.`);
  }
}

export async function buildLibraryBackup(
  db: AppDatabase,
  midiStorage: MidiStorageAdapter,
): Promise<BuildLibraryBackupResult> {
  const baseBackup = db.exportLibraryData();
  const midiFiles: LibraryBackupMidiFile[] = [];
  const missingMidiFiles: string[] = [];

  for (const song of baseBackup.songs) {
    const filename = getSafeMidiFilename(song.id);
    if (!filename) {
      missingMidiFiles.push(song.title || song.id);
      continue;
    }

    try {
      const bytes = await midiStorage.read(song.id);
      midiFiles.push({
        songId: song.id,
        filename,
        dataBase64: Buffer.from(bytes).toString('base64'),
        byteLength: bytes.byteLength,
      });
    } catch {
      missingMidiFiles.push(song.title || song.id);
    }
  }

  return {
    backup: {
      ...baseBackup,
      version: 2,
      midiFiles,
    },
    exportResult: {
      songsExported: baseBackup.songs.length,
      midiFilesIncluded: midiFiles.length,
      missingMidiFiles,
    },
  };
}

function normalizeImportedBackup(
  backup: LibraryBackup,
  restoredSongIds: Set<string>,
  midiStorage: MidiStorageAdapter,
): LibraryBackupV1 {
  return {
    ...backup,
    version: 1,
    songs: backup.songs.map((song) => ({
      ...song,
      filePath: restoredSongIds.has(song.id) ? getStoredMidiPath(song.id, midiStorage) : '',
    })),
  };
}

export async function importLibraryBackup(
  db: AppDatabase,
  backup: LibraryBackup,
  midiStorage: MidiStorageAdapter,
): Promise<LibraryImportResult> {
  const restoredSongIds = new Set<string>();
  const missingMidiFiles: string[] = [];
  const stagedFiles: MidiStorageStagedFile[] = [];
  const supportsRecoverable = midiStorage.stageRestore && midiStorage.rollbackRestore && midiStorage.commitRestore;
  const recoverableStorage = supportsRecoverable
    ? midiStorage as unknown as { stageRestore: (opId: string, songId: string, data: Uint8Array) => Promise<MidiStorageStagedFile>; rollbackRestore: (opId: string) => Promise<void>; commitRestore: (opId: string) => Promise<void> }
    : null;
  let operationId: string | null = null;
  let result: LibraryImportResult | undefined;

  try {
    if (backup.version === 2) {
      const midiFilesBySongId = new Map<string, Uint8Array>();
      backup.songs.forEach(assertBackupSongIdIsSafe);
      backup.midiFiles.forEach(assertBackupMidiFileIsSafe);

      for (const midiFile of backup.midiFiles) {
        if (midiFilesBySongId.has(midiFile.songId)) {
          throw new Error(`Duplicate MIDI backup song id: ${midiFile.songId}.`);
        }
        const bytes = decodeBase64(midiFile.dataBase64, midiFile.songId);
        if (bytes.byteLength !== midiFile.byteLength || await createSongId(bytes) !== midiFile.songId) {
          throw new Error(`MIDI backup content does not match ${midiFile.songId}.`);
        }
        computeSongMetadata(bytes, midiFile.songId);
        midiFilesBySongId.set(midiFile.songId, bytes);
      }

      if (recoverableStorage) {
        operationId = db.prepareDurableOperation('restore-library', {});
        for (const song of backup.songs) {
          const bytes = midiFilesBySongId.get(song.id);
          if (!bytes) {
            missingMidiFiles.push(song.title || song.id);
            continue;
          }
          stagedFiles.push(await recoverableStorage.stageRestore(operationId, song.id, bytes));
          restoredSongIds.add(song.id);
        }

        try {
          for (const stagedFile of stagedFiles) {
            await stagedFile.commit();
          }
        } catch (error) {
          await recoverableStorage.rollbackRestore(operationId);
          db.completeDurableOperation(operationId);
          throw error;
        }

        try {
          result = db.importLibraryData(normalizeImportedBackup(backup, restoredSongIds, midiStorage), operationId);
        } catch (error) {
          await recoverableStorage.rollbackRestore(operationId);
          db.completeDurableOperation(operationId);
          throw error;
        }

        await recoverableStorage.commitRestore(operationId);
        db.completeDurableOperation(operationId);
      } else {
        for (const song of backup.songs) {
          const bytes = midiFilesBySongId.get(song.id);
          if (!bytes) {
            missingMidiFiles.push(song.title || song.id);
            continue;
          }
          stagedFiles.push(await midiStorage.stage(song.id, bytes));
          restoredSongIds.add(song.id);
        }
      }
    } else {
      missingMidiFiles.push(...backup.songs.map((song) => song.title || basename(song.filePath) || song.id));
    }

    if (!recoverableStorage || backup.version !== 2) {
      try {
        for (const stagedFile of stagedFiles) {
          await stagedFile.commit();
        }
      } catch (error) {
        await Promise.allSettled(stagedFiles.map((stagedFile) => stagedFile.rollback?.()));
        throw error;
      }

      try {
        result = db.importLibraryData(normalizeImportedBackup(backup, restoredSongIds, midiStorage));
      } catch (error) {
        await Promise.allSettled(stagedFiles.map((stagedFile) => stagedFile.rollback?.()));
        throw error;
      }
    }

    return {
      ...result!,
      midiFilesRestored: restoredSongIds.size,
      missingMidiFiles,
    };
  } catch (error) {
    throw error;
  } finally {
    await Promise.allSettled(stagedFiles.map((stagedFile) => stagedFile.discard()));
  }
}
