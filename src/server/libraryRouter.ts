import { Hono } from 'hono';
import { buildLibraryBackup, importLibraryBackup, isLibraryBackup } from '../shared/libraryBackup';
import type { ServerDependencies } from './types';

export function createLibraryRouter({ db, midiFilesDir }: ServerDependencies) {
  const router = new Hono();

  router.get('/export', async (c) => {
    const { backup, exportResult } = await buildLibraryBackup(db, midiFilesDir);
    return c.json({
      backup,
      result: {
        ...exportResult,
        filename: `pianohero-library-${new Date().toISOString().slice(0, 10)}.json`,
        target: 'download',
      },
    });
  });

  router.post('/import', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isLibraryBackup(body)) {
      return c.json({ error: 'Invalid library backup file.' }, 400);
    }

    const result = await importLibraryBackup(db, body, midiFilesDir);
    return c.json({ result });
  });

  return router;
}
