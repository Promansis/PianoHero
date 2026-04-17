import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import { importSongFromBuffer } from '../shared/importSong';
import type { ServerDependencies } from './types';

export function createMidiRouter({ db, midiFilesDir }: ServerDependencies) {
  const router = new Hono();

  router.get('/:songId', async (c) => {
    const songId = c.req.param('songId');
    const song = db.getSong(songId);
    if (!song) {
      return c.json({ error: `Song not found: ${songId}` }, 404);
    }

    try {
      const bytes = await readFile(join(midiFilesDir, `${songId}.mid`));
      c.header('Content-Type', 'audio/midi');
      c.header('Cache-Control', 'private, max-age=3600');
      return c.body(bytes);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 404);
    }
  });

  router.post('/upload', async (c) => {
    try {
      const formData = await c.req.formData();
      const files = formData.getAll('files');
      const songs = [];
      const errors = [];

      for (const entry of files) {
        if (!(entry instanceof File)) {
          continue;
        }

        const title = entry.name.replace(/\.(mid|midi)$/i, '') || 'Untitled';
        try {
          songs.push(
            await importSongFromBuffer(new Uint8Array(await entry.arrayBuffer()), title, {
              db,
              midiFilesDir,
            }),
          );
        } catch (err) {
          errors.push({ filename: title, message: (err as Error).message });
        }
      }

      return c.json({ songs, errors });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500);
    }
  });

  return router;
}
