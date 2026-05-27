import { describe, expect, it } from 'vitest';
import type { LibraryBackupV1, LibraryBackupV2 } from './dbTypes';
import { isLibraryBackup } from './libraryBackup';

describe('isLibraryBackup', () => {
  it('accepts v1 backup schema objects', () => {
    const backup: LibraryBackupV1 = {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: [],
      folders: [],
      playlists: [],
      fingerings: [],
      settings: [],
    };

    expect(isLibraryBackup(backup)).toBe(true);
  });

  it('accepts v2 backup schema objects with MIDI entries', () => {
    const backup: LibraryBackupV2 = {
      version: 2,
      exportedAt: new Date().toISOString(),
      songs: [],
      folders: [],
      playlists: [],
      fingerings: [],
      settings: [],
      midiFiles: [{
        songId: 'song-1',
        filename: 'song-1.mid',
        dataBase64: 'AA==',
        byteLength: 1,
      }],
    };

    expect(isLibraryBackup(backup)).toBe(true);
  });

  it('rejects non-backup objects and malformed v2 MIDI entries', () => {
    expect(isLibraryBackup({ version: 999 })).toBe(false);
    expect(isLibraryBackup({
      version: 2,
      songs: [],
      folders: [],
      playlists: [],
      fingerings: [],
      settings: [],
      midiFiles: [{ songId: 'song-1' }],
    })).toBe(false);
  });
});
