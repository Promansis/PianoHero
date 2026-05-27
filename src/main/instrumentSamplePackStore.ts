import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AppDatabase } from '../persistence/database';
import type {
  InstalledInstrumentSamplePackRecord,
  InstrumentSamplePackManifest,
  InstrumentSamplePackStatus,
  ResolvedInstrumentSampleSource,
} from '../shared/ipc';
import {
  buildInstrumentSamplePackStatuses,
  createUrlsFromFilenames,
  getInstrumentSamplePackDefinition,
  INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY,
  isValidPackManifest,
  parseInstalledInstrumentSamplePacks,
  resolveInstalledInstrumentSampleSource,
} from '../lib/audio/instrumentSamplePacks';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a']);

function listAudioFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((file) => {
      const lower = file.toLowerCase();
      return AUDIO_EXTENSIONS.has(lower.slice(lower.lastIndexOf('.')));
    });
  } catch {
    return [];
  }
}

function getInstalledPacks(db: AppDatabase): Record<string, InstalledInstrumentSamplePackRecord> {
  return parseInstalledInstrumentSamplePacks(db.getSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY));
}

function saveInstalledPacks(
  db: AppDatabase,
  installedPacks: Record<string, InstalledInstrumentSamplePackRecord>,
): void {
  db.setSetting('audio', INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY, JSON.stringify(installedPacks));
}

function getAppStaticRootCandidates(appPath: string): string[] {
  return [
    resolve(appPath, 'public'),
    resolve(appPath, 'out', 'renderer'),
    resolve(appPath, 'dist', 'web'),
    resolve(process.cwd(), 'public'),
    resolve(process.cwd(), 'out', 'renderer'),
    resolve(process.cwd(), 'dist', 'web'),
  ];
}

function resolveBundledFilePath(appPath: string, assetPath: string): string {
  const relativePath = assetPath.replace(/^\//, '');
  for (const candidate of getAppStaticRootCandidates(appPath)) {
    const absolutePath = join(candidate, relativePath);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }
  throw new Error(`Bundled asset not found: ${assetPath}`);
}

function loadBundledManifest(appPath: string, manifestPath: string): InstrumentSamplePackManifest {
  const manifestFile = resolveBundledFilePath(appPath, manifestPath);
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as unknown;
  if (!isValidPackManifest(manifest)) {
    throw new Error(`Invalid bundled sample pack manifest: ${manifestPath}`);
  }
  return manifest;
}

function installManagedDesktopInstrumentSamplePack(
  db: AppDatabase,
  userDataPath: string,
  appPath: string,
  instrumentId: string,
  manifestPath: string,
): InstrumentSamplePackStatus[] {
  const manifest = loadBundledManifest(appPath, manifestPath);
  const destinationDir = join(userDataPath, 'instrument-sample-packs', instrumentId);
  rmSync(destinationDir, { recursive: true, force: true });
  mkdirSync(destinationDir, { recursive: true });

  for (const asset of manifest.assets) {
    const sourceFile = resolveBundledFilePath(appPath, asset.url);
    copyFileSync(sourceFile, join(destinationDir, asset.fileName));
  }

  const installedPacks = getInstalledPacks(db);
  installedPacks[instrumentId] = {
    instrumentId,
    packLabel: manifest.packLabel,
    version: manifest.version,
    installedAt: new Date().toISOString(),
    baseUrl: `file:///${destinationDir.replace(/\\/g, '/').replace(/\/?$/, '/')}`,
    urls: Object.fromEntries(manifest.assets.map((asset) => [asset.note, asset.fileName])),
  };
  saveInstalledPacks(db, installedPacks);
  return buildInstrumentSamplePackStatuses('desktop', installedPacks);
}

function installManualDesktopInstrumentSamplePack(
  db: AppDatabase,
  userDataPath: string,
  instrumentId: string,
  sourceDir: string,
): InstrumentSamplePackStatus[] {
  const definition = getInstrumentSamplePackDefinition(instrumentId);
  if (!definition) {
    throw new Error(`No sample pack is configured for instrument: ${instrumentId}`);
  }

  const files = listAudioFiles(sourceDir);
  const urls = createUrlsFromFilenames(files);
  if (Object.keys(urls).length === 0) {
    throw new Error('No compatible audio files were found in the selected directory.');
  }

  const destinationDir = join(userDataPath, 'instrument-sample-packs', instrumentId);
  rmSync(destinationDir, { recursive: true, force: true });
  mkdirSync(destinationDir, { recursive: true });

  for (const file of files) {
    copyFileSync(join(sourceDir, file), join(destinationDir, file));
  }

  const installedPacks = getInstalledPacks(db);
  installedPacks[instrumentId] = {
    instrumentId,
    packLabel: definition.packLabel,
    version: 'manual',
    installedAt: new Date().toISOString(),
    baseUrl: `file:///${destinationDir.replace(/\\/g, '/').replace(/\/?$/, '/')}`,
    urls,
  };
  saveInstalledPacks(db, installedPacks);
  return buildInstrumentSamplePackStatuses('desktop', installedPacks);
}

export function getDesktopInstrumentSamplePackStatuses(db: AppDatabase): InstrumentSamplePackStatus[] {
  return buildInstrumentSamplePackStatuses('desktop', getInstalledPacks(db));
}

export function resolveDesktopInstrumentSampleSource(
  db: AppDatabase,
  instrumentId: string,
): ResolvedInstrumentSampleSource | null {
  return resolveInstalledInstrumentSampleSource(getInstalledPacks(db), instrumentId);
}

export function installDesktopInstrumentSamplePack(
  db: AppDatabase,
  userDataPath: string,
  appPath: string,
  instrumentId: string,
  sourceDir?: string,
): InstrumentSamplePackStatus[] {
  const definition = getInstrumentSamplePackDefinition(instrumentId);
  if (!definition) {
    throw new Error(`No sample pack is configured for instrument: ${instrumentId}`);
  }

  if (definition.installMode === 'managed') {
    if (!definition.manifestPath) {
      throw new Error(`Managed pack manifest missing for ${instrumentId}.`);
    }
    return installManagedDesktopInstrumentSamplePack(db, userDataPath, appPath, instrumentId, definition.manifestPath);
  }

  if (!sourceDir) {
    throw new Error(`A source directory is required to install the ${definition.packLabel}.`);
  }

  return installManualDesktopInstrumentSamplePack(db, userDataPath, instrumentId, sourceDir);
}

export function removeDesktopInstrumentSamplePack(
  db: AppDatabase,
  userDataPath: string,
  instrumentId: string,
): InstrumentSamplePackStatus[] {
  const installedPacks = getInstalledPacks(db);
  delete installedPacks[instrumentId];
  saveInstalledPacks(db, installedPacks);
  rmSync(join(userDataPath, 'instrument-sample-packs', instrumentId), { recursive: true, force: true });
  return buildInstrumentSamplePackStatuses('desktop', installedPacks);
}
