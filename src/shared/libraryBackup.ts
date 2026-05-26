import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  getAppOwnedMidiPath,
  getSafeMidiFilename,
  isPathContainedInRoot,
  isSafeSongStorageId,
} from '../lib/storage/storageSafety';
import type { AppDatabase } from '../main/database';
import type {
  LibraryBackup,
  LibraryBackupMidiFile,
  LibraryBackupV1,
  LibraryBackupV2,
  LibraryExportResult,
  LibraryImportResult,
  SongRow,
} from './dbTypes';

interface BuildLibraryBackupResult {
  backup: LibraryBackupV2;
  exportResult: Omit<LibraryExportResult, 'filename' | 'target' | 'location'>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isLibraryBackupMidiFile(value: unknown): value is LibraryBackupMidiFile {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isString(value.songId) &&
    isString(value.filename) &&
    isString(value.dataBase64) &&
    typeof value.byteLength === 'number'
  );
}

export function isLibraryBackup(value: unknown): value is LibraryBackup {
  if (!isRecord(value)) {
    return false;
  }

  const version = value.version;
  const hasBaseShape =
    Array.isArray(value.songs) &&
    Array.isArray(value.folders) &&
    Array.isArray(value.playlists) &&
    Array.isArray(value.fingerings) &&
    Array.isArray(value.settings);

  if (version === 1) {
    return hasBaseShape;
  }

  if (version === 2) {
    return hasBaseShape && Array.isArray(value.midiFiles) && value.midiFiles.every(isLibraryBackupMidiFile);
  }

  return false;
}

function getStoredMidiPath(songId: string, midiFilesDir: string): string {
  const midiPath = getAppOwnedMidiPath(midiFilesDir, songId);
  if (!midiPath) {
    throw new Error(`Unsafe song id in library backup: ${songId}.`);
  }
  return midiPath;
}

function getStagingPath(stagingDir: string, songId: string): string {
  const filename = getSafeMidiFilename(songId);
  if (!filename) {
    throw new Error(`Unsafe song id in library backup: ${songId}.`);
  }

  const stagingPath = join(stagingDir, filename);
  if (!isPathContainedInRoot(stagingDir, stagingPath)) {
    throw new Error(`Unsafe MIDI staging path for ${songId}.`);
  }
  return stagingPath;
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
  midiFilesDir: string,
): Promise<BuildLibraryBackupResult> {
  const baseBackup = db.exportLibraryData();
  const midiFiles: LibraryBackupMidiFile[] = [];
  const missingMidiFiles: string[] = [];

  for (const song of baseBackup.songs) {
    const midiPath = getAppOwnedMidiPath(midiFilesDir, song.id);
    const filename = getSafeMidiFilename(song.id);
    if (!midiPath || !filename) {
      missingMidiFiles.push(song.title || song.id);
      continue;
    }

    try {
      const bytes = await readFile(midiPath);
      midiFiles.push({
        songId: song.id,
        filename,
        dataBase64: bytes.toString('base64'),
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
  midiFilesDir: string,
): LibraryBackupV1 {
  return {
    ...backup,
    version: 1,
    songs: backup.songs.map((song) => ({
      ...song,
      filePath: restoredSongIds.has(song.id) ? getStoredMidiPath(song.id, midiFilesDir) : '',
    })),
  };
}

function createStagingDir(midiFilesDir: string): string {
  return join(midiFilesDir, `.import-${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}`);
}

export async function importLibraryBackup(
  db: AppDatabase,
  backup: LibraryBackup,
  midiFilesDir: string,
): Promise<LibraryImportResult> {
  await mkdir(midiFilesDir, { recursive: true });

  const restoredSongIds = new Set<string>();
  const missingMidiFiles: string[] = [];
  const stagedFiles: Array<{ stagingPath: string; finalPath: string }> = [];
  const stagingDir = createStagingDir(midiFilesDir);

  try {
    if (backup.version === 2) {
      const midiFilesBySongId = new Map(backup.midiFiles.map((file) => [file.songId, file]));
      backup.songs.forEach(assertBackupSongIdIsSafe);
      backup.midiFiles.forEach(assertBackupMidiFileIsSafe);
      await mkdir(stagingDir, { recursive: true });

      for (const song of backup.songs) {
        const midiFile = midiFilesBySongId.get(song.id);
        if (!midiFile) {
          missingMidiFiles.push(song.title || song.id);
          continue;
        }

        const finalPath = getStoredMidiPath(song.id, midiFilesDir);
        const stagingPath = getStagingPath(stagingDir, song.id);
        const bytes = Buffer.from(midiFile.dataBase64, 'base64');
        if (bytes.byteLength !== midiFile.byteLength) {
          throw new Error(`Invalid MIDI backup data for ${song.title || song.id}.`);
        }

        await writeFile(stagingPath, bytes);
        stagedFiles.push({ stagingPath, finalPath });
        restoredSongIds.add(song.id);
      }
    } else {
      missingMidiFiles.push(...backup.songs.map((song) => song.title || basename(song.filePath) || song.id));
    }

    const result = db.importLibraryData(normalizeImportedBackup(backup, restoredSongIds, midiFilesDir));
    for (const stagedFile of stagedFiles) {
      await rename(stagedFile.stagingPath, stagedFile.finalPath);
    }
    return {
      ...result,
      midiFilesRestored: restoredSongIds.size,
      missingMidiFiles,
    };
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}
