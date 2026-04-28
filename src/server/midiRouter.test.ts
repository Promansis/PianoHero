// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../main/database';
import { createSongId } from '../shared/importSong';
import { createMidiRouter } from './midiRouter';

const tempDirs: string[] = [];

async function makeServer() {
  const dir = await mkdtemp(join(tmpdir(), 'pianohero-midi-router-'));
  tempDirs.push(dir);
  const midiFilesDir = join(dir, 'midi-files');
  await mkdir(midiFilesDir, { recursive: true });
  const db = new AppDatabase(join(dir, 'test.db'));
  const app = new Hono();
  app.route('/api/midi', createMidiRouter({ db, midiFilesDir }));
  return { app, db, midiFilesDir };
}

describe('midiRouter', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('reports invalid web uploads per file', async () => {
    const { app, db } = await makeServer();
    const formData = new FormData();
    formData.append('files', new File(['not-midi'], 'notes.txt', { type: 'text/plain' }));

    const response = await app.request('/api/midi/upload', { method: 'POST', body: formData });
    const payload = await response.json() as { songs: unknown[]; errors: Array<{ message: string }>; skipped: number };
    db.close();

    expect(response.status).toBe(200);
    expect(payload.songs).toEqual([]);
    expect(payload.skipped).toBe(0);
    expect(payload.errors[0].message).toMatch(/Only \.mid and \.midi/);
  });

  it('returns 400 when upload contains no files', async () => {
    const { app, db } = await makeServer();
    const formData = new FormData();

    const response = await app.request('/api/midi/upload', { method: 'POST', body: formData });
    const payload = await response.json() as { error: string };
    db.close();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/No files/);
  });

  it('reports duplicate uploads as skipped', async () => {
    const { app, db, midiFilesDir } = await makeServer();
    const midiBytes = new Uint8Array([77, 84, 104, 100]);
    const songId = await createSongId(midiBytes);
    const existingMidiPath = join(midiFilesDir, `${songId}.mid`);
    await writeFile(existingMidiPath, midiBytes);
    db.addSong({
      id: songId,
      title: 'Duplicate Song',
      artist: '',
      genre: '',
      filePath: existingMidiPath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });

    const formData = new FormData();
    formData.append('files', new File([midiBytes], 'duplicate.mid', { type: 'audio/midi' }));

    const response = await app.request('/api/midi/upload', { method: 'POST', body: formData });
    const payload = await response.json() as { songs: unknown[]; errors: unknown[]; skipped: number };
    db.close();

    expect(payload.songs).toEqual([]);
    expect(payload.errors).toEqual([]);
    expect(payload.skipped).toBe(1);
  });
});
