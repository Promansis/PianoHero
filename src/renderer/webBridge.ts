import { RPC_BRIDGE_METHOD_SET, WEB_STUB_BRIDGE_METHOD_SET } from '../shared/bridgeMethods';
import {
  buildInstrumentSamplePackStatuses,
  getInstrumentSamplePackDefinition,
  isValidPackManifest,
} from '../lib/audio/instrumentSamplePacks';
import type {
  AppBridge,
  ImportResult,
  InstalledInstrumentSamplePackRecord,
  InstrumentSamplePackManifest,
  ResolvedInstrumentSampleSource,
} from '../shared/ipc';
import type { LibraryBackup, LibraryExportResult, LibraryImportResult } from '../shared/dbTypes';

const WEB_PACK_DB_NAME = 'pianohero-instrument-sample-packs';
const WEB_PACK_DB_VERSION = 1;
const WEB_PACK_OBJECT_STORE = 'packs';

interface StoredWebInstrumentPack {
  instrumentId: string;
  packLabel: string;
  version: string;
  installedAt: string;
  sourceName: string;
  licenseLabel: string;
  attributionUrl: string;
  assets: Array<{
    note: string;
    fileName: string;
    blob: Blob;
  }>;
}

const objectUrlCache = new Map<string, string[]>();

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

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function pickJsonFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    };
    document.body.append(input);
    input.click();
  });
}

function revokeObjectUrls(instrumentId: string): void {
  const cachedUrls = objectUrlCache.get(instrumentId);
  if (!cachedUrls) {
    return;
  }
  for (const url of cachedUrls) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.delete(instrumentId);
}

function openPackDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(WEB_PACK_DB_NAME, WEB_PACK_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WEB_PACK_OBJECT_STORE)) {
        db.createObjectStore(WEB_PACK_OBJECT_STORE, { keyPath: 'instrumentId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open the instrument pack database.'));
  });
}

async function withPackStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openPackDatabase();
  try {
    const tx = db.transaction(WEB_PACK_OBJECT_STORE, mode);
    const store = tx.objectStore(WEB_PACK_OBJECT_STORE);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction was aborted.'));
    });
    return result;
  } finally {
    db.close();
  }
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function getStoredWebInstrumentPacks(): Promise<Record<string, StoredWebInstrumentPack>> {
  return withPackStore('readonly', async (store) => {
    const records = await readRequest(store.getAll() as IDBRequest<StoredWebInstrumentPack[]>);
    return Object.fromEntries(records.map((record) => [record.instrumentId, record]));
  });
}

async function putStoredWebInstrumentPack(record: StoredWebInstrumentPack): Promise<void> {
  await withPackStore('readwrite', async (store) => {
    await readRequest(store.put(record));
  });
}

async function deleteStoredWebInstrumentPack(instrumentId: string): Promise<void> {
  await withPackStore('readwrite', async (store) => {
    await readRequest(store.delete(instrumentId));
  });
}

function toInstalledRecordMap(
  packs: Record<string, StoredWebInstrumentPack>,
): Record<string, InstalledInstrumentSamplePackRecord> {
  return Object.fromEntries(
    Object.values(packs).map((pack) => [
      pack.instrumentId,
      {
        instrumentId: pack.instrumentId,
        packLabel: pack.packLabel,
        version: pack.version,
        installedAt: pack.installedAt,
        urls: {},
        baseUrl: null,
      },
    ]),
  );
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

async function installManagedWebInstrumentPack(instrumentId: string): Promise<Record<string, StoredWebInstrumentPack>> {
  const manifest = await fetchPackManifest(instrumentId);
  const assets = await Promise.all(
    manifest.assets.map(async (asset) => {
      const response = await fetch(asset.url);
      if (!response.ok) {
        throw new Error(`Unable to download ${asset.fileName} for ${manifest.packLabel}.`);
      }
      return {
        note: asset.note,
        fileName: asset.fileName,
        blob: await response.blob(),
      };
    }),
  );

  await putStoredWebInstrumentPack({
    instrumentId: manifest.instrumentId,
    packLabel: manifest.packLabel,
    version: manifest.version,
    installedAt: new Date().toISOString(),
    sourceName: manifest.sourceName,
    licenseLabel: manifest.licenseLabel,
    attributionUrl: manifest.attributionUrl,
    assets,
  });

  return getStoredWebInstrumentPacks();
}

async function resolveStoredWebInstrumentPack(
  instrumentId: string,
): Promise<ResolvedInstrumentSampleSource | null> {
  const packs = await getStoredWebInstrumentPacks();
  const pack = packs[instrumentId];
  if (!pack) {
    return null;
  }

  revokeObjectUrls(instrumentId);
  const urls: Record<string, string> = {};
  const createdUrls: string[] = [];
  for (const asset of pack.assets) {
    const objectUrl = URL.createObjectURL(asset.blob);
    createdUrls.push(objectUrl);
    urls[asset.note] = objectUrl;
  }
  objectUrlCache.set(instrumentId, createdUrls);

  return {
    instrumentId,
    source: 'enhanced',
    urls,
    baseUrl: null,
    packLabel: pack.packLabel,
  };
}

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
      return async (): Promise<ImportResult> => ({ songs: [], errors: [], skipped: 0 });
    }

    if (property === 'exportLibrary') {
      return async (): Promise<LibraryExportResult> => {
        const response = await fetch('/api/library/export');
        if (!response.ok) {
          let message = `Export failed with status ${response.status}`;
          try {
            const body = await response.json() as { error?: string };
            message = body.error ?? message;
          } catch {
            // Fall back to the HTTP status message.
          }
          throw new Error(message);
        }
        const payload = await response.json() as { backup: LibraryBackup; result: LibraryExportResult };
        downloadJson(payload.result.filename, payload.backup);
        return payload.result;
      };
    }

    if (property === 'importLibrary') {
      return async (): Promise<LibraryImportResult | null> => {
        const file = await pickJsonFile();
        if (!file) {
          return null;
        }

        const backup = JSON.parse(await file.text()) as unknown;
        const response = await fetch('/api/library/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backup),
        });
        return parseRpcResponse<LibraryImportResult>(response);
      };
    }

    if (property === 'onImportProgress') {
      return () => () => undefined;
    }

    if (property === 'listAudioFiles') {
      return async (): Promise<string[]> => [];
    }

    if (property === 'getInstrumentSamplePackStatuses') {
      return async () => buildInstrumentSamplePackStatuses('web', toInstalledRecordMap(await getStoredWebInstrumentPacks()));
    }

    if (property === 'installInstrumentSamplePack') {
      return async (instrumentId: string) =>
        buildInstrumentSamplePackStatuses('web', toInstalledRecordMap(await installManagedWebInstrumentPack(instrumentId)));
    }

    if (property === 'removeInstrumentSamplePack') {
      return async (instrumentId: string) => {
        revokeObjectUrls(instrumentId);
        await deleteStoredWebInstrumentPack(instrumentId);
        return buildInstrumentSamplePackStatuses('web', toInstalledRecordMap(await getStoredWebInstrumentPacks()));
      };
    }

    if (property === 'resolveInstrumentSampleSource') {
      return async (instrumentId: string) => resolveStoredWebInstrumentPack(instrumentId);
    }

    if (WEB_STUB_BRIDGE_METHOD_SET.has(property)) {
      return async (): Promise<null> => null;
    }

    if (RPC_BRIDGE_METHOD_SET.has(property)) {
      return async (...args: unknown[]) => callRpc(property, args);
    }

    return undefined;
  },
});
