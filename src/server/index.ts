import { serve } from '@hono/node-server';
import { mkdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { Hono } from 'hono';
import { AppDatabase } from '../main/database';
import { createBridgeRouter } from './bridgeRouter';
import { createMidiRouter } from './midiRouter';

const port = Number(process.env.PORT ?? 3000);
const dataDir = resolve(process.env.PIANOHERO_DATA_DIR ?? join(process.cwd(), '.pianohero-data'));
const midiFilesDir = join(dataDir, 'midi-files');
const dbPath = join(dataDir, 'pianohero.db');
const webRoot = resolve(process.cwd(), 'dist', 'web');

mkdirSync(dataDir, { recursive: true });
mkdirSync(midiFilesDir, { recursive: true });

const db = new AppDatabase(dbPath);
const app = new Hono();

app.onError((error, c) => c.json({ error: error.message }, 500));

app.use('*', async (c, next) => {
  c.header('Permissions-Policy', 'midi=(self)');
  await next();
});

app.route('/api/bridge', createBridgeRouter({ db, midiFilesDir }));
app.route('/api/midi', createMidiRouter({ db, midiFilesDir }));

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveStaticPath(pathname: string): string {
  const trimmedPath = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = normalize(trimmedPath).replace(/^([.][.][/\\])+/, '');
  return resolve(webRoot, `.${normalizedPath}`);
}

app.get('*', async (c) => {
  const requestedPath = c.req.path;
  const absolutePath = resolveStaticPath(requestedPath);

  if (!absolutePath.startsWith(webRoot)) {
    return c.notFound();
  }

  try {
    const fileStats = await stat(absolutePath);
    if (fileStats.isFile()) {
      const body = await readFile(absolutePath);
      c.header('Content-Type', CONTENT_TYPES[extname(absolutePath)] ?? 'application/octet-stream');
      return c.body(body);
    }
  } catch {
    if (extname(requestedPath)) {
      return c.notFound();
    }
  }

  try {
    const indexPath = join(webRoot, 'index.html');
    const body = await readFile(indexPath);
    c.header('Content-Type', 'text/html; charset=utf-8');
    return c.body(body);
  } catch {
    return c.text('Web build not found. Run npm run build:web first.', 404);
  }
});

const server = serve({
  fetch: app.fetch,
  port,
});

process.on('SIGINT', () => {
  db.close();
  server.close();
});

process.on('SIGTERM', () => {
  db.close();
  server.close();
});
