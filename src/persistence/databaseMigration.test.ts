// @vitest-environment node

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './database';
import { FileSystemMidiStorageAdapter } from '../storage/midiStorage';
import { createSongId } from '../lib/midi/importMetadata';
import { Midi } from '@tonejs/midi';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('legacy JSON migration', () => {
  it('copies verified source MIDI into app-owned storage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-migration-'));
    roots.push(root);
    const sourcePath = join(root, 'source.mid');
    const midi = new Midi();
    midi.addTrack().addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.8 });
    const bytes = midi.toArray();
    const id = await createSongId(bytes);
    await writeFile(sourcePath, bytes);
    await writeFile(join(root, 'song-metadata.json'), JSON.stringify({ songs: {
      [id]: { title: 'Migrated', sourcePath, trackAssignments: {}, updatedAt: '2026-07-30T00:00:00.000Z' },
    } }));

    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi-files'));
    const db = new AppDatabase(join(root, 'pianohero.db'));
    await db.migrateFromJson(root, storage);

    expect(db.getSong(id)?.filePath).toBe(join(root, 'midi-files', `${id}.mid`));
    await expect(readFile(join(root, 'midi-files', `${id}.mid`))).resolves.toEqual(Buffer.from(bytes));
    db.close();
  });

  it('keeps an unavailable legacy row explicit when the source is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-migration-missing-'));
    roots.push(root);
    const id = 'legacy-song';
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'song-metadata.json'), JSON.stringify({ songs: {
      [id]: { title: 'Missing', sourcePath: join(root, 'missing.mid'), trackAssignments: {}, updatedAt: '2026-07-30T00:00:00.000Z' },
    } }));

    const db = new AppDatabase(join(root, 'pianohero.db'));
    await db.migrateFromJson(root, new FileSystemMidiStorageAdapter(join(root, 'midi-files')));
    expect(db.getSong(id)?.filePath).toBe('');
    db.close();
  });

  it('repairs existing legacy rows after JSON migration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-migration-repair-'));
    roots.push(root);
    const sourcePath = join(root, 'source.mid');
    const midi = new Midi();
    midi.addTrack().addNote({ midi: 64, time: 0, duration: 0.5, velocity: 0.8 });
    const bytes = midi.toArray();
    const id = 'legacy-song';
    await writeFile(sourcePath, bytes);
    await writeFile(join(root, 'song-metadata.json.migrated'), JSON.stringify({ songs: {
      [id]: { title: 'Repaired', sourcePath, trackAssignments: {}, updatedAt: '2026-07-30T00:00:00.000Z' },
    } }));

    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi-files'));
    const db = new AppDatabase(join(root, 'pianohero.db'));
    db.addSong({
      id,
      title: 'Repaired',
      artist: '',
      genre: '',
      filePath: sourcePath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });

    await db.migrateFromJson(root, storage);

    expect(db.getSong(id)?.filePath).toBe(join(root, 'midi-files', `${id}.mid`));
    await expect(readFile(join(root, 'midi-files', `${id}.mid`))).resolves.toEqual(Buffer.from(bytes));
    db.close();
  });

  it('does not overwrite an already app-owned MIDI reference during repair', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pianohero-migration-owned-'));
    roots.push(root);
    const id = 'legacy-song';
    const storage = new FileSystemMidiStorageAdapter(join(root, 'midi-files'));
    const ownedPath = await storage.write(id, new Uint8Array([1, 2, 3]));
    await writeFile(join(root, 'song-metadata.json.migrated'), JSON.stringify({ songs: {
      [id]: { title: 'Owned', sourcePath: join(root, 'missing.mid'), trackAssignments: {}, updatedAt: '2026-07-30T00:00:00.000Z' },
    } }));

    const db = new AppDatabase(join(root, 'pianohero.db'));
    db.addSong({
      id,
      title: 'Owned',
      artist: '',
      genre: '',
      filePath: ownedPath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });

    await db.migrateFromJson(root, storage);

    expect(db.getSong(id)?.filePath).toBe(ownedPath);
    await expect(readFile(ownedPath)).resolves.toEqual(Buffer.from([1, 2, 3]));
    db.close();
  });
});
