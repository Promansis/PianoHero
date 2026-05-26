import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../main/database';
import type { LibraryBackupV1, LibraryBackupV2 } from './dbTypes';
import { buildLibraryBackup, importLibraryBackup, isLibraryBackup } from './libraryBackup';

const tempDirs: string[] = [];
const songId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const otherSongId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pianohero-library-backup-'));
  tempDirs.push(dir);
  return dir;
}

function addSong(db: AppDatabase, id: string, filePath: string): void {
  db.addSong({
    id,
    title: `Song ${id}`,
    artist: 'Composer',
    genre: 'Classical',
    filePath,
    difficulty: 3,
    durationSec: 12,
    bpm: 120,
    noteCount: 4,
    tags: ['warmup'],
    trackAssignments: {},
  });
}

describe('library backups', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('exports MIDI bytes in v2 backups and restores playable file paths', async () => {
    const sourceDir = await makeTempDir();
    const sourceMidiDir = join(sourceDir, 'midi-files');
    await mkdir(sourceMidiDir, { recursive: true });
    const sourceDb = new AppDatabase(join(sourceDir, 'source.db'));
    const midiPath = join(sourceMidiDir, `${songId}.mid`);
    await writeFile(midiPath, new Uint8Array([77, 84, 104, 100]));
    addSong(sourceDb, songId, midiPath);

    const { backup, exportResult } = await buildLibraryBackup(sourceDb, sourceMidiDir);
    sourceDb.close();

    expect(backup.version).toBe(2);
    expect(backup.midiFiles).toHaveLength(1);
    expect(exportResult.midiFilesIncluded).toBe(1);
    expect(exportResult.missingMidiFiles).toEqual([]);

    const targetDir = await makeTempDir();
    const targetMidiDir = join(targetDir, 'midi-files');
    const targetDb = new AppDatabase(join(targetDir, 'target.db'));
    const importResult = await importLibraryBackup(targetDb, backup, targetMidiDir);
    const restoredSong = targetDb.getSong(songId);
    targetDb.close();

    expect(importResult.midiFilesRestored).toBe(1);
    expect(restoredSong?.filePath).toBe(join(targetMidiDir, `${songId}.mid`));
    await expect(readFile(join(targetMidiDir, `${songId}.mid`))).resolves.toEqual(Buffer.from([77, 84, 104, 100]));
  });

  it('exports only app-owned MIDI files under the configured storage root', async () => {
    const sourceDir = await makeTempDir();
    const sourceMidiDir = join(sourceDir, 'midi-files');
    const foreignDir = await makeTempDir();
    await mkdir(sourceMidiDir, { recursive: true });
    const sourceDb = new AppDatabase(join(sourceDir, 'source.db'));

    const appOwnedPath = join(sourceMidiDir, `${songId}.mid`);
    const foreignPath = join(foreignDir, `${otherSongId}.mid`);
    await writeFile(appOwnedPath, new Uint8Array([1, 2, 3]));
    await writeFile(foreignPath, new Uint8Array([4, 5, 6]));
    addSong(sourceDb, songId, foreignPath);
    addSong(sourceDb, otherSongId, foreignPath);

    const { backup, exportResult } = await buildLibraryBackup(sourceDb, sourceMidiDir);
    sourceDb.close();

    expect(backup.midiFiles.map((file) => file.songId)).toEqual([songId]);
    expect(exportResult.midiFilesIncluded).toBe(1);
    expect(exportResult.missingMidiFiles).toEqual([`Song ${otherSongId}`]);
  });

  it('rejects crafted backup MIDI entries before writing outside storage', async () => {
    const targetDir = await makeTempDir();
    const targetMidiDir = join(targetDir, 'midi-files');
    const targetDb = new AppDatabase(join(targetDir, 'target.db'));
    const backup: LibraryBackupV2 = {
      version: 2,
      exportedAt: new Date().toISOString(),
      songs: [],
      folders: [],
      playlists: [],
      fingerings: [],
      settings: [],
      midiFiles: [{
        songId: '../escape',
        filename: '../escape.mid',
        dataBase64: Buffer.from([1, 2, 3]).toString('base64'),
        byteLength: 3,
      }],
    };

    await expect(importLibraryBackup(targetDb, backup, targetMidiDir)).rejects.toThrow(/Unsafe MIDI backup song id/);
    targetDb.close();

    expect(existsSync(join(targetDir, 'escape.mid'))).toBe(false);
  });

  it('stages restored MIDI files until database import succeeds', async () => {
    const targetDir = await makeTempDir();
    const targetMidiDir = join(targetDir, 'midi-files');
    await mkdir(targetMidiDir, { recursive: true });
    const existingPath = join(targetMidiDir, `${songId}.mid`);
    await writeFile(existingPath, new Uint8Array([9, 9, 9]));
    const targetDb = new AppDatabase(join(targetDir, 'target.db'));
    const backup: LibraryBackupV2 = {
      version: 2,
      exportedAt: new Date().toISOString(),
      songs: [{
        id: songId,
        title: 'Bad Playlist Song',
        artist: '',
        genre: '',
        filePath: '/old/path.mid',
        difficulty: 1,
        durationSec: 1,
        bpm: 120,
        noteCount: 1,
        dateAdded: new Date().toISOString(),
        timesPlayed: 0,
        tags: [],
        isFavorite: false,
        folderId: null,
        trackAssignments: {},
      }],
      folders: [],
      playlists: [{
        id: 'bad-playlist',
        name: null as unknown as string,
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        songIds: [songId],
      }],
      fingerings: [],
      settings: [],
      midiFiles: [{
        songId,
        filename: `${songId}.mid`,
        dataBase64: Buffer.from([1, 2, 3]).toString('base64'),
        byteLength: 3,
      }],
    };

    await expect(importLibraryBackup(targetDb, backup, targetMidiDir)).rejects.toThrow();
    const remainingEntries = await readdir(targetMidiDir);
    targetDb.close();

    await expect(readFile(existingPath)).resolves.toEqual(Buffer.from([9, 9, 9]));
    expect(remainingEntries).toEqual([`${songId}.mid`]);
  });

  it('keeps v1 backup support while reporting missing MIDI files', async () => {
    const targetDir = await makeTempDir();
    const targetDb = new AppDatabase(join(targetDir, 'target.db'));
    const backup: LibraryBackupV1 = {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: [{
        id: 'legacy-song',
        title: 'Legacy Song',
        artist: '',
        genre: '',
        filePath: '/old/path.mid',
        difficulty: 1,
        durationSec: 1,
        bpm: 120,
        noteCount: 1,
        dateAdded: new Date().toISOString(),
        timesPlayed: 0,
        tags: [],
        isFavorite: false,
        folderId: null,
        trackAssignments: {},
      }],
      folders: [],
      playlists: [],
      fingerings: [],
      settings: [],
    };

    expect(isLibraryBackup(backup)).toBe(true);

    const result = await importLibraryBackup(targetDb, backup, join(targetDir, 'midi-files'));
    targetDb.close();

    expect(result.songsImported).toBe(1);
    expect(result.midiFilesRestored).toBe(0);
    expect(result.missingMidiFiles).toEqual(['Legacy Song']);
  });
});
