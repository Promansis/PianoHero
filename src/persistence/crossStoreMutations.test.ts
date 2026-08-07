// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './database';
import { deleteSongsAcrossStores, resetUserDataAcrossStores } from './crossStoreMutations';
import { FileSystemMidiStorageAdapter } from '../storage/midiStorage';

const roots: string[] = [];
const songId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function addSong(db: AppDatabase): void {
  db.addSong({ id: songId, title: 'Song', artist: '', genre: '', filePath: '', difficulty: 1, durationSec: 1, bpm: 120, noteCount: 1, tags: [], trackAssignments: {} });
}

describe('cross-store mutations', () => {
  it('keeps the database row and MIDI bytes when deletion fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-cross-store-delete-'));
    roots.push(root);
    const db = new AppDatabase(join(root, 'db'));
    addSong(db);
    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi'));
    await storage.write(songId, new Uint8Array([1, 2, 3]));
    storage.stageDelete = async () => { throw new Error('delete failed'); };

    await expect(deleteSongsAcrossStores(db, storage, [songId], () => db.deleteSong(songId))).rejects.toThrow('delete failed');
    expect(db.getSong(songId)).not.toBeNull();
    await expect(storage.read(songId)).resolves.toEqual(new Uint8Array([1, 2, 3]));
    db.close();
  });

  it('restores MIDI data when reset fails before database commit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-cross-store-reset-'));
    roots.push(root);
    const db = new AppDatabase(join(root, 'db'));
    addSong(db);
    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi'));
    await storage.write(songId, new Uint8Array([4, 5, 6]));
    storage.stageReset = async () => { throw new Error('reset failed'); };

    await expect(resetUserDataAcrossStores(db, storage)).rejects.toThrow('reset failed');
    expect(db.getSong(songId)).not.toBeNull();
    db.close();
  });

  it('recovers a prepared delete after reopening the database', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-cross-store-recovery-'));
    roots.push(root);
    const dbPath = join(root, 'db');
    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi'));
    const db = new AppDatabase(dbPath);
    addSong(db);
    await storage.write(songId, new Uint8Array([7, 8, 9]));
    const operationId = db.prepareDurableOperation('delete-songs', { songIds: [songId] });
    await storage.stageDelete(operationId, [songId]);
    db.close();

    const reopenedDb = new AppDatabase(dbPath);
    await reopenedDb.recoverDurableOperations(storage);

    expect(reopenedDb.getSong(songId)).not.toBeNull();
    await expect(storage.read(songId)).resolves.toEqual(new Uint8Array([7, 8, 9]));
    expect(reopenedDb.getDurableOperations()).toEqual([]);
    reopenedDb.close();
  });
});
