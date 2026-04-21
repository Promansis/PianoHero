import type {
  InstalledInstrumentSamplePackRecord,
  InstrumentSamplePackManifest,
  InstrumentSamplePackStatus,
  ResolvedInstrumentSampleSource,
} from '../../shared/ipc';

export type InstrumentSamplePackInstallMode = 'manual' | 'managed';
export type InstrumentSamplePackRuntime = 'desktop' | 'web';

export interface InstrumentSamplePackDefinition {
  instrumentId: string;
  packLabel: string;
  installMode: InstrumentSamplePackInstallMode;
  requiresPackForSelection?: boolean;
  manifestPath?: string;
  installHelpText: string;
}

export const INSTALLED_INSTRUMENT_SAMPLE_PACKS_SETTING_KEY = 'installedInstrumentSamplePacks';

export const INSTRUMENT_SAMPLE_PACK_DEFINITIONS: Record<string, InstrumentSamplePackDefinition> = {
  flute: {
    instrumentId: 'flute',
    packLabel: 'Flute Enhanced Pack',
    installMode: 'managed',
    manifestPath: '/instrument-packs/flute/manifest.json',
    installHelpText: 'Install an enhanced flute pack with denser sample anchors.',
  },
  clarinet: {
    instrumentId: 'clarinet',
    packLabel: 'Clarinet Enhanced Pack',
    installMode: 'managed',
    manifestPath: '/instrument-packs/clarinet/manifest.json',
    installHelpText: 'Install an enhanced clarinet pack with denser sample anchors.',
  },
  trumpet: {
    instrumentId: 'trumpet',
    packLabel: 'Trumpet Enhanced Pack',
    installMode: 'managed',
    manifestPath: '/instrument-packs/trumpet/manifest.json',
    installHelpText: 'Install an enhanced trumpet pack with brighter long-note samples.',
  },
  'french-horn': {
    instrumentId: 'french-horn',
    packLabel: 'French Horn Enhanced Pack',
    installMode: 'managed',
    manifestPath: '/instrument-packs/french-horn/manifest.json',
    installHelpText: 'Install an enhanced horn pack with denser orchestral coverage.',
  },
  saxophone: {
    instrumentId: 'saxophone',
    packLabel: 'Saxophone Enhanced Pack',
    installMode: 'managed',
    manifestPath: '/instrument-packs/saxophone/manifest.json',
    installHelpText: 'Install an enhanced saxophone pack with denser reed-note coverage.',
  },
  cello: {
    instrumentId: 'cello',
    packLabel: 'Cello Pack',
    installMode: 'manual',
    requiresPackForSelection: true,
    installHelpText: 'Import a cello sample directory to enable the cello instrument.',
  },
  'string-ensemble': {
    instrumentId: 'string-ensemble',
    packLabel: 'String Ensemble Pack',
    installMode: 'manual',
    requiresPackForSelection: true,
    installHelpText: 'Import a string ensemble sample directory to enable the string ensemble instrument.',
  },
};

export function getInstrumentSamplePackDefinition(instrumentId: string): InstrumentSamplePackDefinition | null {
  return INSTRUMENT_SAMPLE_PACK_DEFINITIONS[instrumentId] ?? null;
}

export function instrumentRequiresInstalledPack(instrumentId: string): boolean {
  return Boolean(getInstrumentSamplePackDefinition(instrumentId)?.requiresPackForSelection);
}

export function listPackEnabledInstrumentIds(): string[] {
  return Object.keys(INSTRUMENT_SAMPLE_PACK_DEFINITIONS);
}

export function extractNoteName(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '');
  const salamander = /^([A-G])s(\d{1,2})$/.exec(base);
  if (salamander) {
    return `${salamander[1]}#${salamander[2]}`;
  }

  const philharmonia = /([A-G](?:s|#|b)?\d{1,2})_(?:\d+|long)/i.exec(base);
  if (philharmonia) {
    return philharmonia[1].replace('s', '#');
  }

  const standard = /^([A-G][#b]?\d{1,2})$/.exec(base);
  if (standard) {
    return standard[1];
  }

  return null;
}

export function createUrlsFromFilenames(files: string[]): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const file of files) {
    const noteName = extractNoteName(file);
    if (noteName) {
      urls[noteName] = file;
    }
  }
  return urls;
}

export function parseInstalledInstrumentSamplePacks(rawValue: string | null | undefined): Record<string, InstalledInstrumentSamplePackRecord> {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, InstalledInstrumentSamplePackRecord>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        Boolean(
          value &&
          typeof value.instrumentId === 'string' &&
          typeof value.packLabel === 'string' &&
          typeof value.installedAt === 'string' &&
          value.urls &&
          typeof value.urls === 'object',
        ),
      ),
    );
  } catch {
    return {};
  }
}

export function buildInstrumentSamplePackStatuses(
  runtime: InstrumentSamplePackRuntime,
  installedPacks: Record<string, InstalledInstrumentSamplePackRecord>,
): InstrumentSamplePackStatus[] {
  return listPackEnabledInstrumentIds().map((instrumentId) => {
    const definition = getInstrumentSamplePackDefinition(instrumentId)!;
    const installedRecord = installedPacks[instrumentId];
    const canInstallInApp = runtime === 'desktop' || Boolean(definition.manifestPath);
    return {
      instrumentId,
      packLabel: definition.packLabel,
      isInstalled: Boolean(installedRecord),
      canInstallInApp,
      requiresPackForSelection: Boolean(definition.requiresPackForSelection),
      installMode: definition.installMode,
      installedAt: installedRecord?.installedAt ?? null,
      installedVersion: installedRecord?.version ?? null,
      statusMessage: installedRecord
        ? `${definition.packLabel} installed.`
        : definition.requiresPackForSelection
          ? definition.installHelpText
          : `Using built-in samples. ${definition.installHelpText}`,
    };
  });
}

export function resolveInstalledInstrumentSampleSource(
  installedPacks: Record<string, InstalledInstrumentSamplePackRecord>,
  instrumentId: string,
): ResolvedInstrumentSampleSource | null {
  const installedRecord = installedPacks[instrumentId];
  if (!installedRecord) {
    return null;
  }

  return {
    instrumentId,
    source: 'enhanced',
    baseUrl: installedRecord.baseUrl ?? null,
    urls: installedRecord.urls,
    packLabel: installedRecord.packLabel,
  };
}

export function isValidPackManifest(value: unknown): value is InstrumentSamplePackManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<InstrumentSamplePackManifest>;
  return (
    typeof manifest.instrumentId === 'string' &&
    typeof manifest.packLabel === 'string' &&
    typeof manifest.version === 'string' &&
    Array.isArray(manifest.assets) &&
    manifest.assets.every((asset) =>
      asset &&
      typeof asset.note === 'string' &&
      typeof asset.fileName === 'string' &&
      typeof asset.url === 'string',
    )
  );
}
