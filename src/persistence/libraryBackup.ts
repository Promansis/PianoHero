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

  try {
    if (backup.version === 2) {
      const midiFilesBySongId = new Map(backup.midiFiles.map((file) => [file.songId, file]));
      backup.songs.forEach(assertBackupSongIdIsSafe);
      backup.midiFiles.forEach(assertBackupMidiFileIsSafe);

      for (const song of backup.songs) {
        const midiFile = midiFilesBySongId.get(song.id);
        if (!midiFile) {
          missingMidiFiles.push(song.title || song.id);
          continue;
        }

        const bytes = Buffer.from(midiFile.dataBase64, 'base64');
        if (bytes.byteLength !== midiFile.byteLength) {
          throw new Error(`Invalid MIDI backup data for ${song.title || song.id}.`);
        }

        stagedFiles.push(await midiStorage.stage(song.id, bytes));
        restoredSongIds.add(song.id);
      }
    } else {
      missingMidiFiles.push(...backup.songs.map((song) => song.title || basename(song.filePath) || song.id));
    }

    const result = db.importLibraryData(normalizeImportedBackup(backup, restoredSongIds, midiStorage));
    for (const stagedFile of stagedFiles) {
      await stagedFile.commit();
    }
    return {
      ...result,
      midiFilesRestored: restoredSongIds.size,
      missingMidiFiles,
    };
  } finally {
    await Promise.allSettled(stagedFiles.map((stagedFile) => stagedFile.discard()));
  }
}
