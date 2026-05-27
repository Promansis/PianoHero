import { Hono } from 'hono';
import { buildLibraryBackup, importLibraryBackup } from '../persistence/libraryBackup';
import { isLibraryBackup } from '../shared/libraryBackup';
import type { ServerDependencies } from './types';
import { libraryImportBodyLimit } from './webSecurity';

export function createLibraryRouter({ db, midiStorage }: ServerDependencies) {
  const router = new Hono();

  router.get('/export', async (c) => {
    const { backup, exportResult } = await buildLibraryBackup(db, midiStorage);
    return c.json({
      backup,
      result: {
        ...exportResult,
        filename: `pianohero-library-${new Date().toISOString().slice(0, 10)}.json`,
        target: 'download',
      },
    });
  });

  router.post('/import', libraryImportBodyLimit(), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isLibraryBackup(body)) {
      return c.json({ error: 'Invalid library backup file.' }, 400);
    }

    const result = await importLibraryBackup(db, body, midiStorage);
    return c.json({ result });
  });

  return router;
}
