import { afterEach, describe, expect, it, vi } from 'vitest';
import { webBridge } from './webBridge';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

function mockFetch(response: Response): FetchMock {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockPickedFile(file: { text: () => Promise<string> }): void {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'input') {
      Object.defineProperty(element, 'files', {
        configurable: true,
        value: [file],
      });
      vi.spyOn(element, 'click').mockImplementation(() => {
        element.dispatchEvent(new Event('change'));
      });
    }
    return element;
  }) as typeof document.createElement);
}

describe('webBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('forwards RPC bridge methods and returns the response result', async () => {
    const fetchMock = mockFetch(jsonResponse({ result: [{ id: 'song-1' }] }));

    await expect(webBridge.getAllSongs()).resolves.toEqual([{ id: 'song-1' }]);

    expect(fetchMock).toHaveBeenCalledWith('/api/bridge/getAllSongs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args: [] }),
    });
  });

  it('parses RPC error messages from JSON responses', async () => {
    mockFetch(jsonResponse({ error: 'Nope.' }, { status: 400 }));

    await expect(webBridge.getSong('song-1')).rejects.toThrow('Nope.');
  });

  it('returns null for known desktop-only stubs', async () => {
    await expect(webBridge.pickMidiFile()).resolves.toBeNull();
    await expect(webBridge.saveMidiFile('song.mid', new Uint8Array([1, 2]))).resolves.toBeNull();
    await expect(webBridge.pickSampleDirectory()).resolves.toBeNull();
  });

  it('reports loadMidiFileData HTTP failures with the response status', async () => {
    mockFetch(new Response('missing', { status: 404 }));

    await expect(webBridge.loadMidiFileData('song-1')).rejects.toThrow('Unable to load MIDI: 404');
  });

  it('downloads exported libraries from the browser export endpoint', async () => {
    const result = {
      filename: 'pianohero-library.json',
      target: 'download',
      songsExported: 0,
      midiFilesIncluded: 0,
      missingMidiFiles: [],
    };
    const fetchMock = mockFetch(jsonResponse({ backup: { version: 2, songs: [], midiFiles: [] }, result }));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:backup'),
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await expect(webBridge.exportLibrary()).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith('/api/library/export');
    expect(anchorClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });

  it('imports picked library backups through the browser import endpoint', async () => {
    const backup = { version: 2, exportedAt: '2026-05-27T00:00:00.000Z', songs: [], midiFiles: [] };
    const file = { text: () => Promise.resolve(JSON.stringify(backup)) };
    mockPickedFile(file);
    const result = {
      songsImported: 0,
      foldersImported: 0,
      playlistsImported: 0,
      midiFilesRestored: 0,
      missingMidiFiles: [],
    };
    const fetchMock = mockFetch(jsonResponse({ result }));

    await expect(webBridge.importLibrary()).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith('/api/library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup),
    });
  });
});
