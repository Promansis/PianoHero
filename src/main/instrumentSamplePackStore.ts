import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { AppDatabase } from './database';
import type { InstalledInstrumentSamplePackRecord, InstrumentSamplePackStatus, ResolvedInstrumentSampleSource } from '../shared/ipc';
import {
  buildInstrumentSamplePackStatuses,
  createUrlsFromFilenames,
  getInstrumentSamplePackDefinition,
  INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY,
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
