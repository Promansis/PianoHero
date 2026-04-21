import { RPC_BRIDGE_METHOD_SET } from '../shared/bridgeMethods';
import {
  buildInstrumentSamplePackStatuses,
  getInstrumentSamplePackDefinition,
  isValidPackManifest,
  parseInstalledInstrumentSamplePacks,
  resolveInstalledInstrumentSampleSource,
} from '../lib/audio/instrumentSamplePacks';
import type {
  AppBridge,
  ImportResult,
  InstalledInstrumentSamplePackRecord,
  InstrumentSamplePackManifest,
} from '../shared/ipc';

const WEB_INSTALLED_PACKS_STORAGE_KEY = 'pianohero:installedInstrumentSamplePacks';

async function parseRpcResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Fall back to the HTTP status message.
    }
    throw new Error(message);
  }

  const payload = await response.json() as { result: T };
  return payload.result;
}

async function callRpc(method: string, args: unknown[]): Promise<unknown> {
  const response = await fetch(`/api/bridge/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ args }),
  });
  return parseRpcResponse(response);
}

function getStoredInstrumentSamplePacks(): Record<string, InstalledInstrumentSamplePackRecord> {
  return parseInstalledInstrumentSamplePacks(window.localStorage.getItem(WEB_INSTALLED_PACKS_STORAGE_KEY));
}

function setStoredInstrumentSamplePacks(installedPacks: Record<string, InstalledInstrumentSamplePackRecord>): void {
  window.localStorage.setItem(WEB_INSTALLED_PACKS_STORAGE_KEY, JSON.stringify(installedPacks));
}

async function fetchPackManifest(instrumentId: string): Promise<InstrumentSamplePackManifest> {
  const definition = getInstrumentSamplePackDefinition(instrumentId);
  if (!definition?.manifestPath) {
    throw new Error('This pack can only be installed from the desktop app.');
  }

  const response = await fetch(definition.manifestPath);
  if (!response.ok) {
    throw new Error(`Unable to load the ${definition.packLabel} manifest.`);
  }

  const manifest = await response.json() as unknown;
  if (!isValidPackManifest(manifest)) {
    throw new Error(`Invalid sample pack manifest for ${instrumentId}.`);
  }

  return manifest;
}

const desktopStubNames = new Set<keyof AppBridge>([
  'pickMidiFile',
  'importMidiFolder',
  'exportLibrary',
  'importLibrary',
  'saveMidiFile',
  'saveWavFile',
  'pickAudioFile',
  'pickSampleDirectory',
]);

export const webBridge = new Proxy({} as AppBridge, {
  get(_target, property) {
    if (typeof property !== 'string') {
      return undefined;
    }

    if (property === 'loadMidiFileData') {
      return async (songId: string): Promise<Uint8Array> => {
        const response = await fetch(`/api/midi/${encodeURIComponent(songId)}`);
        if (!response.ok) {
          throw new Error(`Unable to load MIDI: ${response.status}`);
        }
        return new Uint8Array(await response.arrayBuffer());
      };
    }

    if (property === 'loadCurriculumMidi') {
      return async (filename: string): Promise<Uint8Array> => {
        const response = await fetch(`/curriculum-midis/${encodeURIComponent(filename)}`);
        if (!response.ok) {
          throw new Error(`Unable to load curriculum MIDI: ${response.status}`);
        }
        return new Uint8Array(await response.arrayBuffer());
      };
    }

    if (property === 'importMidiFiles') {
      return async (): Promise<ImportResult> => ({ songs: [], errors: [] });
    }

    if (property === 'onImportProgress') {
      return () => () => undefined;
    }

    if (property === 'listAudioFiles') {
      return async (): Promise<string[]> => [];
    }

    if (property === 'getInstrumentSamplePackStatuses') {
      return async () => buildInstrumentSamplePackStatuses('web', getStoredInstrumentSamplePacks());
    }

    if (property === 'installInstrumentSamplePack') {
      return async (instrumentId: string) => {
        const manifest = await fetchPackManifest(instrumentId);
        const installedPacks = getStoredInstrumentSamplePacks();
        installedPacks[instrumentId] = {
          instrumentId,
          packLabel: manifest.packLabel,
          version: manifest.version,
          installedAt: new Date().toISOString(),
          baseUrl: null,
          urls: Object.fromEntries(
            manifest.assets.map((asset) => [asset.note, new URL(asset.url, window.location.origin).href]),
          ),
        };
        setStoredInstrumentSamplePacks(installedPacks);
        return buildInstrumentSamplePackStatuses('web', installedPacks);
      };
    }

    if (property === 'removeInstrumentSamplePack') {
      return async (instrumentId: string) => {
        const installedPacks = getStoredInstrumentSamplePacks();
        delete installedPacks[instrumentId];
        setStoredInstrumentSamplePacks(installedPacks);
        return buildInstrumentSamplePackStatuses('web', installedPacks);
      };
    }

    if (property === 'resolveInstrumentSampleSource') {
      return async (instrumentId: string) => resolveInstalledInstrumentSampleSource(getStoredInstrumentSamplePacks(), instrumentId);
    }

    if (desktopStubNames.has(property as keyof AppBridge)) {
      return async (): Promise<null> => null;
    }

    if (RPC_BRIDGE_METHOD_SET.has(property)) {
      return async (...args: unknown[]) => callRpc(property, args);
    }

    return undefined;
  },
});
