// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../persistence/database';
import { FileSystemMidiStorageAdapter } from '../storage/midiStorage';
import { createLibraryRouter } from './libraryRouter';
import { LIBRARY_IMPORT_BODY_LIMIT_BYTES } from './webSecurity';
import { createSongId } from '../lib/midi/importMetadata';
import { Midi } from '@tonejs/midi';

const tempDirs: string[] = [];
const songId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function makeServer() {
  const dir = await mkdtemp(join(tmpdir(), 'lumakeys-library-router-'));
  tempDirs.push(dir);
  const midiFilesDir = join(dir, 'midi-files');
  await mkdir(midiFilesDir, { recursive: true });
  const db = new AppDatabase(join(dir, 'test.db'));
  const midiStorage = new FileSystemMidiStorageAdapter(midiFilesDir);
  const app = new Hono();
  app.route('/api/library', createLibraryRouter({ db, midiFilesDir, midiStorage }));
  return { app, db, midiFilesDir };
}

describe('libraryRouter', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('exports and imports self-contained library JSON', async () => {
    const { app, db, midiFilesDir } = await makeServer();
    const midi = new Midi();
    midi.addTrack().addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.8 });
    const midiBytes = midi.toArray();
    const contentSongId = await createSongId(midiBytes);
    const midiPath = join(midiFilesDir, `${contentSongId}.mid`);
    await writeFile(midiPath, midiBytes);
    db.addSong({
      id: contentSongId,
      title: 'Song A',
      artist: '',
      genre: '',
      filePath: midiPath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });

    const exportResponse = await app.request('/api/library/export');
    const exportPayload = await exportResponse.json() as { backup: unknown; result: { midiFilesIncluded: number } };
    expect(exportPayload.result.midiFilesIncluded).toBe(1);

    db.resetUserData();
    const importResponse = await app.request('/api/library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportPayload.backup),
    });
    const importPayload = await importResponse.json() as { result: { songsImported: number; midiFilesRestored: number } };
    db.close();

    expect(importPayload.result.songsImported).toBe(1);
    expect(importPayload.result.midiFilesRestored).toBe(1);
  });

  it('rejects invalid library imports', async () => {
    const { app, db } = await makeServer();

    const response = await app.request('/api/library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 999 }),
    });
    const payload = await response.json() as { error: string };
    db.close();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid library backup/);
  });

  it('returns 413 for oversized library imports', async () => {
    const { app, db } = await makeServer();

    const response = await app.request('/api/library/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(LIBRARY_IMPORT_BODY_LIMIT_BYTES + 1),
      },
      body: JSON.stringify({ version: 2, songs: [], midiFiles: 'x'.repeat(LIBRARY_IMPORT_BODY_LIMIT_BYTES) }),
    });
    const payload = await response.json() as { error: string };
    db.close();

    expect(response.status).toBe(413);
    expect(payload.error).toMatch(/Library import/);
  });
});
