import type {
  LibraryBackup,
  LibraryBackupMidiFile,
} from './dbTypes';

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
