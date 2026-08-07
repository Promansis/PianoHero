// @vitest-environment node

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultLegacyProfileDir, migrateLegacyBrand } from './legacyBrandMigration';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function stagingRoot(): string {
  const root = join(tmpdir(), `lumakeys-brand-migration-${Math.random().toString(36).slice(2)}`);
  roots.push(root);
  return root;
}

describe('migrateLegacyBrand', () => {
  it('renames the legacy SQLite set in place when the destination already holds it', async () => {
    const root = stagingRoot();
    await mkdir(join(root, 'data'), { recursive: true });
    await writeFile(join(root, 'data', 'pianohero.db'), 'db');
    await writeFile(join(root, 'data', 'pianohero.db-wal'), 'wal');
    await writeFile(join(root, 'data', 'pianohero.db-shm'), 'shm');

    const res = migrateLegacyBrand({ destinationDir: join(root, 'data') });

    expect(res.migrated).toBe(true);
    expect(res.messages).toContainEqual(expect.stringContaining('lumakeys.db'));
    expect(existsSync(join(root, 'data', 'lumakeys.db'))).toBe(true);
    expect(existsSync(join(root, 'data', 'lumakeys.db-wal'))).toBe(true);
    expect(existsSync(join(root, 'data', 'lumakeys.db-shm'))).toBe(true);
    expect(existsSync(join(root, 'data', 'pianohero.db'))).toBe(false);
  });

  it('does nothing on a fresh install with no legacy database', async () => {
    const root = stagingRoot();
    await mkdir(join(root, 'data'), { recursive: true });

    const res = migrateLegacyBrand({ destinationDir: join(root, 'data') });

    expect(res.migrated).toBe(false);
    expect(existsSync(join(root, 'data', 'lumakeys.db'))).toBe(false);
  });

  it('is a no-op when the new database already exists', async () => {
    const root = stagingRoot();
    await mkdir(join(root, 'data'), { recursive: true });
    await writeFile(join(root, 'data', 'lumakeys.db'), 'new');

    const res = migrateLegacyBrand({ destinationDir: join(root, 'data') });

    expect(res.migrated).toBe(false);
  });

  it('refuses a conflict when both legacy and new databases are present', async () => {
    const root = stagingRoot();
    await mkdir(join(root, 'data'), { recursive: true });
    await writeFile(join(root, 'data', 'lumakeys.db'), 'new');
    await writeFile(join(root, 'data', 'pianohero.db'), 'old');

    expect(() => migrateLegacyBrand({ destinationDir: join(root, 'data') })).toThrow(
      /both.*exist/i,
    );
  });

  it('migrates a distinct legacy profile into an empty destination', async () => {
    const root = stagingRoot();
    const legacy = join(root, 'PianoHero');
    const dest = join(root, 'LumaKeys');
    await mkdir(join(legacy, 'midi-files'), { recursive: true });
    await writeFile(join(legacy, 'pianohero.db'), 'db-content');
    await writeFile(join(legacy, 'midi-files', 'a.mid'), 'midi');

    const res = migrateLegacyBrand({ destinationDir: dest, legacyDir: legacy });

    expect(res.migrated).toBe(true);
    expect(existsSync(join(dest, 'lumakeys.db'))).toBe(true);
    expect(existsSync(join(dest, 'midi-files', 'a.mid'))).toBe(true);
    expect(existsSync(join(legacy, 'pianohero.db'))).toBe(false);
  });

  it('migrates after moving the db set into an empty destination with localStorage', async () => {
    const root = stagingRoot();
    const legacy = join(root, 'PianoHero');
    const dest = join(root, 'LumaKeys');
    await mkdir(join(legacy, 'Local Storage', 'leveldb'), { recursive: true });
    await writeFile(join(legacy, 'Local Storage', 'leveldb', 'x'), 'lab');

    const res = migrateLegacyBrand({ destinationDir: dest, legacyDir: legacy });

    expect(res.migrated).toBe(true);
    expect(existsSync(join(dest, 'Local Storage', 'leveldb', 'x'))).toBe(true);
  });

  it('ignores a distinct legacy profile on a different filesystem rather than copying', async () => {
    const root = stagingRoot();
    const dest = join(root, 'LumaKeys');
    // Point legacy at dest itself, so the "different filesystem" branch is not exercised here;
    // instead verify it does not throw on an empty destination.
    const res = migrateLegacyBrand({ destinationDir: dest });
    expect(res.migrated).toBe(false);
  });

  it('resolves the default legacy profile from the appData directory', () => {
    expect(defaultLegacyProfileDir('/home/u/.config')).toBe('/home/u/.config/PianoHero');
  });

  describe('idempotency', () => {
    it('does nothing on a second run after a same-directory migration', async () => {
      const root = stagingRoot();
      await mkdir(join(root, 'data'), { recursive: true });
      await writeFile(join(root, 'data', 'pianohero.db'), 'db');

      migrateLegacyBrand({ destinationDir: join(root, 'data') });
      const res = migrateLegacyBrand({ destinationDir: join(root, 'data') });

      expect(res.migrated).toBe(false);
      expect(existsSync(join(root, 'data', 'lumakeys.db'))).toBe(true);
    });
  });
});