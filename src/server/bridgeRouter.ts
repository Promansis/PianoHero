import { mkdirSync, rmSync } from 'node:fs';
import { Hono } from 'hono';
import { recomputeAllSongDifficulties } from '../shared/importSong';
import { RPC_BRIDGE_METHOD_SET } from '../shared/bridgeMethods';
import type { ServerDependencies } from './types';

type JsonBody = {
  args?: unknown[];
};

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validatePhaseTwoArgs(method: string, args: unknown[], db: ServerDependencies['db']): string | null {
  switch (method) {
    case 'getLibrarySnapshot':
    case 'getAllFolders':
    case 'getAllPlaylists':
    case 'getRecommendations':
      return args.length === 0 ? null : `${method} does not accept arguments.`;
    case 'getSong':
    case 'deleteSong':
    case 'toggleFavorite':
    case 'getUserStats':
      return isString(args[0]) ? null : `${method} requires a non-empty string id.`;
    case 'getSetting':
      return isString(args[0]) && isString(args[1]) ? null : 'getSetting requires category and key.';
    case 'setSetting':
      return isString(args[0]) && isString(args[1]) && typeof args[2] === 'string'
        ? null
        : 'setSetting requires category, key, and value.';
    case 'createFolder':
    case 'createPlaylist':
      return isString(args[0]) ? null : `${method} requires a non-empty name.`;
    case 'renameFolder':
      return isString(args[0]) && isString(args[1]) ? null : 'renameFolder requires a folder id and name.';
    case 'deleteFolder':
      return isString(args[0]) ? null : 'deleteFolder requires a folder id.';
    case 'moveSongToFolder':
      if (!isString(args[0]) || !isNullableString(args[1])) {
        return 'moveSongToFolder requires a song id and nullable folder id.';
      }
      if (args[1] !== null && !db.getAllFolders().some((folder) => folder.id === args[1])) {
        return `Unknown folder: ${args[1]}`;
      }
      return null;
    case 'updatePlaylist':
      return isString(args[0]) && isRecord(args[1]) ? null : 'updatePlaylist requires a playlist id and update object.';
    case 'deletePlaylist':
    case 'getPlaylistSongs':
      return isString(args[0]) ? null : `${method} requires a playlist id.`;
    case 'addSongToPlaylist':
    case 'removeSongFromPlaylist':
      return isString(args[0]) && isString(args[1]) ? null : `${method} requires playlist and song ids.`;
    case 'reorderPlaylistSong':
      return isString(args[0]) && isString(args[1]) && Number.isInteger(args[2])
        ? null
        : 'reorderPlaylistSong requires playlist id, song id, and integer order.';
    case 'bulkDeleteSongs':
      return isStringArray(args[0]) ? null : 'bulkDeleteSongs requires a song id array.';
    case 'bulkMoveSongsToFolder':
      if (!isStringArray(args[0]) || !isNullableString(args[1])) {
        return 'bulkMoveSongsToFolder requires song ids and nullable folder id.';
      }
      if (args[1] !== null && !db.getAllFolders().some((folder) => folder.id === args[1])) {
        return `Unknown folder: ${args[1]}`;
      }
      return null;
    case 'bulkAddTag':
    case 'bulkRemoveTag':
      return isStringArray(args[0]) && isString(args[1]) ? null : `${method} requires song ids and tag.`;
    case 'bulkAddToPlaylist':
      return isStringArray(args[0]) && isString(args[1]) ? null : 'bulkAddToPlaylist requires song ids and playlist id.';
    default:
      return null;
  }
}

export function createBridgeRouter({ db, midiFilesDir }: ServerDependencies) {
  const router = new Hono();

  router.post('/:method', async (c) => {
    const method = c.req.param('method');
    if (!RPC_BRIDGE_METHOD_SET.has(method)) {
      return c.json({ error: `Unknown bridge method: ${method}` }, 404);
    }

    const body = await c.req.json<JsonBody>().catch(() => null);
    const args = Array.isArray(body?.args) ? body.args : [];
    const validationError = validatePhaseTwoArgs(method, args, db);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    try {
      if (method === 'resetUserData') {
        db.resetUserData();
        rmSync(midiFilesDir, { recursive: true, force: true });
        mkdirSync(midiFilesDir, { recursive: true });
        return c.json({ result: null });
      }

      if (method === 'recomputeAllSongDifficulties') {
        const result = await recomputeAllSongDifficulties({ db, midiFilesDir });
        return c.json({ result });
      }

      const fn = (db as unknown as Record<string, (...nextArgs: unknown[]) => unknown>)[method];
      if (typeof fn !== 'function') {
        return c.json({ error: `Bridge method is not callable: ${method}` }, 500);
      }

      const result = await Promise.resolve(fn.apply(db, args));
      return c.json({ result: result ?? null });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500);
    }
  });

  return router;
}
