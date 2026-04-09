import { mkdirSync, rmSync } from 'node:fs';
import { Hono } from 'hono';
import { RPC_BRIDGE_METHOD_SET } from '../shared/bridgeMethods';
import type { ServerDependencies } from './types';

type JsonBody = {
  args?: unknown[];
};

export function createBridgeRouter({ db, midiFilesDir }: ServerDependencies) {
  const router = new Hono();

  router.post('/:method', async (c) => {
    const method = c.req.param('method');
    if (!RPC_BRIDGE_METHOD_SET.has(method)) {
      return c.json({ error: `Unknown bridge method: ${method}` }, 404);
    }

    const body = await c.req.json<JsonBody>().catch(() => null);
    const args = Array.isArray(body?.args) ? body.args : [];

    try {
      if (method === 'resetUserData') {
        db.resetUserData();
        rmSync(midiFilesDir, { recursive: true, force: true });
        mkdirSync(midiFilesDir, { recursive: true });
        return c.json({ result: null });
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
