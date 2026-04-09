import { RPC_BRIDGE_METHOD_SET } from '../shared/bridgeMethods';
import type { AppBridge, ImportedSong } from '../shared/ipc';

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

    if (property === 'importMidiFiles') {
      return async (): Promise<ImportedSong[]> => [];
    }

    if (property === 'listAudioFiles') {
      return async (): Promise<string[]> => [];
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
