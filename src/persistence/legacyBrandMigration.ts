// Shared Node-side helper to carry a legacy `pianohero` data set into the
// current `lumakeys` layout. Used by Electron main and the web server before
// `new AppDatabase(...)`. Uses only `node:fs`/`node:path`. Old brand names
// survive only inside this module and its tests.

import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface LegacyBrandMigrationOptions {
  /** The final data directory the app will open (e.g. `${userData}` or `${dataDir}`). */
  destinationDir: string;
  /** Optional distinct legacy profile directory from released builds. */
  legacyDir?: string;
}

export interface LegacyBrandMigrationResult {
  migrated: boolean;
  messages: string[];
}

const LEGACY_DB_SET = ['pianohero.db', 'pianohero.db-wal', 'pianohero.db-shm'];

/** App-owned entries moved in when the destination profile is empty and a legacy profile exists. */
const PROFILE_ENTRIES = [
  'midi-files',
  'instrument-sample-packs',
  'song-metadata.json',
  'song-metadata.json.migrated',
  'Local Storage',
];

function isSameFilesystem(a: string, b: string): boolean {
  return statSync(a).dev === statSync(b).dev;
}

function isLegacyDbSet(dir: string): boolean {
  return LEGACY_DB_SET.some((name) => existsSync(join(dir, name)));
}

function renameDbSet(oldDir: string, newDir: string, messages: string[]): void {
  const mapping: Record<string, string> = {
    'pianohero.db': 'lumakeys.db',
    'pianohero.db-wal': 'lumakeys.db-wal',
    'pianohero.db-shm': 'lumakeys.db-shm',
  };
  for (const [oldName, newName] of Object.entries(mapping)) {
    const from = join(oldDir, oldName);
    if (!existsSync(from)) {
      continue;
    }
    renameSync(from, join(newDir, newName));
  }
  messages.push('Renamed legacy SQLite set (pianohero.db) to lumakeys.db');
}

function renameEntry(from: string, to: string): void {
  if (!existsSync(from)) {
    return;
  }
  if (existsSync(to)) {
    throw new Error(`Destination ${to} already exists; refusing to merge or overwrite.`);
  }
  renameSync(from, to);
}

/**
 * One-release compatibility boundary carrying a legacy `pianohero` profile or
 * database into the current `lumakeys` layout at startup.
 *
 * - Same directory already contains `pianohero.db` (and -wal/-shm): rename the
 *   complete SQLite set to `lumakeys.*` so the database opens in place.
 * - Destination profile is empty and a distinct legacy profile is given: rename
 *   the app-owned entries into place before the app opens its database.
 *
 * Never overwrites a non-empty destination, never auto-merges two profiles, and
 * refuses to cross filesystems (where a rename would silently degrade to copy).
 * Idempotent: once the new layout exists, later starts do nothing.
 */
export function migrateLegacyBrand(
  options: LegacyBrandMigrationOptions,
): LegacyBrandMigrationResult {
  const { destinationDir, legacyDir } = options;
  const messages: string[] = [];
  mkdirSync(destinationDir, { recursive: true });

  const hasLegacyDb = isLegacyDbSet(destinationDir);
  const hasNewDb = existsSync(join(destinationDir, 'lumakeys.db'));

  if (hasNewDb) {
    if (hasLegacyDb) {
      throw new Error(
        `Both ${join(destinationDir, 'lumakeys.db')} and a legacy pianohero.db exist `
          + `in ${destinationDir}. Back up one and remove the other before starting.`,
      );
    }
    return { migrated: false, messages };
  }

  if (hasLegacyDb) {
    renameDbSet(destinationDir, destinationDir, messages);
    return { migrated: true, messages };
  }

  if (legacyDir && existsSync(legacyDir)) {
    if (!isSameFilesystem(legacyDir, destinationDir)) {
      throw new Error(
        `Legacy profile ${legacyDir} and ${destinationDir} are on different filesystems. ` +
          `Move them manually; do not merge here.`,
      );
    }
    const moved = [...PROFILE_ENTRIES, ...LEGACY_DB_SET].filter((name) =>
      existsSync(join(legacyDir, name)),
    );
    if (moved.length === 0) {
      return { migrated: false, messages };
    }
    for (const name of moved) {
      // The SQLite set is renamed as it arrives so the destination is already new-layout.
      if (LEGACY_DB_SET.includes(name)) {
        renameEntry(join(legacyDir, name), join(destinationDir, `lumakeys${name.slice(name.lastIndexOf('.'))}`));
        continue;
      }
      renameEntry(join(legacyDir, name), join(destinationDir, name));
    }
    if (isLegacyDbSet(destinationDir)) {
      renameDbSet(destinationDir, destinationDir, messages);
    }
    messages.push(`Migrated legacy profile ${legacyDir}`);
    return { migrated: true, messages };
  }

  return { migrated: false, messages };
}

/** Determines the legacy Electron profile directory that released builds used. */
export function defaultLegacyProfileDir(appDataDir: string): string {
  return join(appDataDir, 'PianoHero');
}