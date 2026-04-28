// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../main/database';
import { RPC_BRIDGE_METHODS } from '../shared/bridgeMethods';
import { createBridgeRouter, getValidatedRpcBridgeMethods } from './bridgeRouter';

const tempDirs: string[] = [];

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
