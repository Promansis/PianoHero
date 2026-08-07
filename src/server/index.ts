import { serve } from '@hono/node-server';
import { mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { Hono } from 'hono';
import { AppDatabase } from '../persistence/database';
import { migrateLegacyBrand } from '../persistence/legacyBrandMigration';
import { FileSystemMidiStorageAdapter } from '../storage/midiStorage';
import { createBridgeRouter } from './bridgeRouter';
import { createLibraryRouter } from './libraryRouter';
import { createMidiRouter } from './midiRouter';
import { createApiAccessGate } from './webSecurity';

/** New env first, legacy env as a one-release fallback. */
function resolveAccessToken(): string | undefined {
  return process.env.LUMAKEYS_WEB_ACCESS_TOKEN ?? process.env.PIANOHERO_WEB_ACCESS_TOKEN;
}

/** Legacy-first env precedence so a pre-rename deployment keeps its data during one release. */
function resolveDataDir(): string {
  const explicit = process.env.LUMAKEYS_DATA_DIR;
  if (explicit && explicit.trim()) {
    return resolve(explicit);
  }
  const legacyEnv = process.env.PIANOHERO_DATA_DIR;
  if (legacyEnv && legacyEnv.trim()) {
    return resolve(legacyEnv);
  }
  if (existsSync(join(process.cwd(), '.lumakeys-data'))) {
    return resolve('.lumakeys-data');
  }
  if (existsSync(join(process.cwd(), '.pianohero-data'))) {
    return resolve('.pianohero-data');
  }
  return resolve('.lumakeys-data');
}

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 3100);
  const dataDir = resolveDataDir();
  const midiFilesDir = join(dataDir, 'midi-files');
  const dbPath = join(dataDir, 'lumakeys.db');
  const webRoot = resolve(process.cwd(), 'dist', 'web');

  migrateLegacyBrand({ destinationDir: dataDir });

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(midiFilesDir, { recursive: true });

  const db = new AppDatabase(dbPath);
  const midiStorage = new FileSystemMidiStorageAdapter(midiFilesDir);
  await db.migrateFromJson(dataDir, midiStorage);
  await db.recoverDurableOperations(midiStorage);
  const app = new Hono();

  app.onError((error, c) => c.json({ error: error.message }, 500));

  app.use('*', async (c, next) => {
    c.header('Permissions-Policy', 'midi=(self)');
    await next();
  });

  app.use('/api/*', createApiAccessGate(resolveAccessToken()));
  app.get('/api/access', (c) => c.json({ ok: true }));

  app.route('/api/bridge', createBridgeRouter({ db, midiFilesDir, midiStorage }));
  app.route('/api/library', createLibraryRouter({ db, midiFilesDir, midiStorage }));
  app.route('/api/midi', createMidiRouter({ db, midiFilesDir, midiStorage }));

  const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  };

  const IMMUTABLE_ASSET_PATH_PATTERN = /^\/assets\/.+-[A-Za-z0-9_-]+\.(?:css|js)$/;

  function setStaticCacheHeaders(pathname: string, absolutePath: string, setHeader: (name: string, value: string) => void): void {
  const extension = extname(absolutePath);

  if (extension === '.html' || pathname === '/') {
    setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    setHeader('Pragma', 'no-cache');
    setHeader('Expires', '0');
    return;
  }

  if (IMMUTABLE_ASSET_PATH_PATTERN.test(pathname)) {
    setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  if (extension === '.json') {
    setHeader('Cache-Control', 'no-cache, must-revalidate');
    return;
  }

  setHeader('Cache-Control', 'public, max-age=3600');
  }

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
      setStaticCacheHeaders(requestedPath, absolutePath, (name, value) => c.header(name, value));
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
    setStaticCacheHeaders('/', indexPath, (name, value) => c.header(name, value));
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
}

startServer().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
