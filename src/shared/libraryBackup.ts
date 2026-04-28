import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
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

function resolveStoredMidiPath(song: SongRow, midiFilesDir: string): string {
  return song.filePath?.trim() ? song.filePath : join(midiFilesDir, `${song.id}.mid`);
}

function toStoredMidiPath(songId: string, midiFilesDir: string): string {
  return join(midiFilesDir, `${songId}.mid`);
}

export async function buildLibraryBackup(
  db: AppDatabase,
  midiFilesDir: string,
): Promise<BuildLibraryBackupResult> {
  const baseBackup = db.exportLibraryData();
  const midiFiles: LibraryBackupMidiFile[] = [];
  const missingMidiFiles: string[] = [];

  for (const song of baseBackup.songs) {
    try {
      const bytes = await readFile(resolveStoredMidiPath(song, midiFilesDir));
      midiFiles.push({
        songId: song.id,
        filename: `${song.id}.mid`,
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
      filePath: restoredSongIds.has(song.id) ? toStoredMidiPath(song.id, midiFilesDir) : song.filePath,
    })),
  };
}

export async function importLibraryBackup(
  db: AppDatabase,
  backup: LibraryBackup,
  midiFilesDir: string,
): Promise<LibraryImportResult> {
  await mkdir(midiFilesDir, { recursive: true });

  const restoredSongIds = new Set<string>();
  const missingMidiFiles: string[] = [];

  if (backup.version === 2) {
    const midiFilesBySongId = new Map(backup.midiFiles.map((file) => [file.songId, file]));

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

      await writeFile(toStoredMidiPath(song.id, midiFilesDir), bytes);
      restoredSongIds.add(song.id);
    }
  } else {
    missingMidiFiles.push(...backup.songs.map((song) => song.title || basename(song.filePath) || song.id));
  }

  const result = db.importLibraryData(normalizeImportedBackup(backup, restoredSongIds, midiFilesDir));
  return {
    ...result,
    midiFilesRestored: restoredSongIds.size,
    missingMidiFiles,
  };
}
