// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../main/database';
import {
  APP_BRIDGE_METHODS,
  RPC_BRIDGE_METHODS,
  WEB_BRIDGE_METHOD_CATEGORIES,
  WEB_SPECIAL_BRIDGE_METHODS,
  WEB_STUB_BRIDGE_METHODS,
} from '../shared/bridgeMethods';
import { createBridgeRouter, getValidatedRpcBridgeMethods } from './bridgeRouter';

const tempDirs: string[] = [];
const songId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const otherSongId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

async function makeServer() {
  const dir = await mkdtemp(join(tmpdir(), 'pianohero-bridge-router-'));
  tempDirs.push(dir);
  const midiFilesDir = join(dir, 'midi-files');
  await mkdir(midiFilesDir, { recursive: true });
  const db = new AppDatabase(join(dir, 'test.db'));
  const app = new Hono();
  app.route('/api/bridge', createBridgeRouter({ db, midiFilesDir }));
  return { app, db, midiFilesDir };
}

async function postBridge(app: Hono, method: string, args: unknown[] | null) {
  return app.request(`/api/bridge/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: args === null ? '{bad json' : JSON.stringify({ args }),
  });
}

describe('bridgeRouter', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('keeps validator coverage aligned with exposed RPC methods', () => {
    expect(getValidatedRpcBridgeMethods()).toEqual(RPC_BRIDGE_METHODS);
  });

  it('categorizes every web bridge method exactly once', () => {
    const categorized = [
      ...WEB_BRIDGE_METHOD_CATEGORIES.rpc,
      ...WEB_BRIDGE_METHOD_CATEGORIES.special,
      ...WEB_BRIDGE_METHOD_CATEGORIES.stub,
    ];
    const counts = new Map<string, number>();

    for (const method of categorized) {
      counts.set(method, (counts.get(method) ?? 0) + 1);
    }

    expect([...counts.entries()].filter(([, count]) => count !== 1)).toEqual([]);
    expect([...counts.keys()].sort()).toEqual([...APP_BRIDGE_METHODS].sort());
    expect(WEB_BRIDGE_METHOD_CATEGORIES.rpc).toBe(RPC_BRIDGE_METHODS);
    expect(WEB_BRIDGE_METHOD_CATEGORIES.special).toBe(WEB_SPECIAL_BRIDGE_METHODS);
    expect(WEB_BRIDGE_METHOD_CATEGORIES.stub).toBe(WEB_STUB_BRIDGE_METHODS);
  });

  it('returns 404 for unknown bridge methods', async () => {
    const { app, db } = await makeServer();
    const response = await postBridge(app, 'notReal', []);
    db.close();

    expect(response.status).toBe(404);
  });

  it('returns 400 for malformed bridge bodies and invalid destructive method arguments', async () => {
    const { app, db } = await makeServer();

    const malformed = await postBridge(app, 'getAllSongs', null);
    const resetUserDataWithArgs = await postBridge(app, 'resetUserData', ['unexpected']);
    const resetLearningWithArgs = await postBridge(app, 'resetLearningProgress', ['unexpected']);
    db.close();

    expect(malformed.status).toBe(400);
    expect(resetUserDataWithArgs.status).toBe(400);
    expect(resetLearningWithArgs.status).toBe(400);
  });

  it('validates payload shape before dispatching to the database', async () => {
    const { app, db } = await makeServer();

    const badSave = await postBridge(app, 'saveGameResult', [{ songId: 'song-1' }]);
    const badDelete = await postBridge(app, 'bulkDeleteSongs', ['song-1']);
    db.close();

    expect(badSave.status).toBe(400);
    expect(badDelete.status).toBe(400);
  });

  it('accepts only persisted game result modes', async () => {
    const { app, db } = await makeServer();
    db.addSong({
      id: songId,
      title: 'Etude',
      artist: '',
      genre: '',
      filePath: '',
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });
    const basePayload = {
      songId,
      score: 100,
      accuracy: 95,
      maxCombo: 5,
      perfectHits: 5,
      goodHits: 0,
      okHits: 0,
      misses: 0,
      tempo: 1,
      durationSec: 30,
      measureAccuracy: [],
    };

    const pianoHero = await postBridge(app, 'saveGameResult', [{ ...basePayload, mode: 'piano-hero' }]);
    const learning = await postBridge(app, 'saveGameResult', [{ ...basePayload, mode: 'learning' }]);
    const performanceMode = await postBridge(app, 'saveGameResult', [{ ...basePayload, mode: 'performance' }]);
    const freePlay = await postBridge(app, 'saveGameResult', [{ ...basePayload, mode: 'free-play' }]);
    db.close();

    expect(pianoHero.status).toBe(200);
    expect(learning.status).toBe(200);
    expect(performanceMode.status).toBe(200);
    expect(freePlay.status).toBe(400);
  });

  it('rejects web song mutation payloads that try to persist file paths', async () => {
    const { app, db } = await makeServer();
    const songPayload = {
      id: songId,
      title: 'Etude',
      artist: '',
      genre: '',
      filePath: '/tmp/foreign.mid',
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    };

    const addResponse = await postBridge(app, 'addSong', [songPayload]);
    const updateResponse = await postBridge(app, 'updateSong', [songId, { filePath: '/tmp/foreign.mid' }]);
    db.close();

    expect(addResponse.status).toBe(400);
    expect(updateResponse.status).toBe(400);
  });

  it('rejects row-only song and trouble spot mutation fields', async () => {
    const { app, db } = await makeServer();

    const timesPlayed = await postBridge(app, 'updateSong', [songId, { timesPlayed: 4 }]);
    const troubleSpotId = await postBridge(app, 'updateTroubleSpot', ['spot-1', { songId }]);
    const troubleSpotDerivedField = await postBridge(app, 'updateTroubleSpot', ['spot-1', { struggleCount: 2 }]);
    db.close();

    expect(timesPlayed.status).toBe(400);
    expect(troubleSpotId.status).toBe(400);
    expect(troubleSpotDerivedField.status).toBe(400);
  });

  it('derives web addSong file paths from app-owned storage', async () => {
    const { app, db, midiFilesDir } = await makeServer();

    const response = await postBridge(app, 'addSong', [{
      id: songId,
      title: 'Etude',
      artist: '',
      genre: '',
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    }]);
    const payload = await response.json() as { result: { filePath: string } };
    db.close();

    expect(response.status).toBe(200);
    expect(payload.result.filePath).toBe(join(midiFilesDir, `${songId}.mid`));
  });

  it('deletes only app-owned MIDI files for web song deletion', async () => {
    const { app, db, midiFilesDir } = await makeServer();
    const appOwnedPath = join(midiFilesDir, `${songId}.mid`);
    const foreignDir = await mkdtemp(join(tmpdir(), 'pianohero-foreign-midi-'));
    tempDirs.push(foreignDir);
    const foreignPath = join(foreignDir, `${otherSongId}.mid`);

    await writeFile(appOwnedPath, new Uint8Array([1, 2, 3]));
    await writeFile(foreignPath, new Uint8Array([4, 5, 6]));
    db.addSong({
      id: songId,
      title: 'Song A',
      artist: '',
      genre: '',
      filePath: foreignPath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });
    db.addSong({
      id: otherSongId,
      title: 'Song B',
      artist: '',
      genre: '',
      filePath: foreignPath,
      difficulty: 1,
      durationSec: 1,
      bpm: 120,
      noteCount: 1,
      tags: [],
      trackAssignments: {},
    });

    const response = await postBridge(app, 'bulkDeleteSongs', [[songId, otherSongId]]);
    db.close();

    expect(response.status).toBe(200);
    expect(existsSync(appOwnedPath)).toBe(false);
    expect(existsSync(foreignPath)).toBe(true);
  });

  it('resets user data and recreates the MIDI directory', async () => {
    const { app, db, midiFilesDir } = await makeServer();
    await writeFile(join(midiFilesDir, 'orphan.mid'), new Uint8Array([1, 2, 3]));

    const response = await postBridge(app, 'resetUserData', []);
    const payload = await response.json() as { result: null };
    db.close();

    expect(response.status).toBe(200);
    expect(payload.result).toBeNull();
    expect(existsSync(midiFilesDir)).toBe(true);
  });
});
