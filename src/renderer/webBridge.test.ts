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

function mockPicker(actions: Array<{ event: 'change' | 'cancel' | 'focus'; files?: unknown[] }>): void {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'input') {
      const action = actions.shift() ?? { event: 'cancel' };
      Object.defineProperty(element, 'files', {
        configurable: true,
        value: action.files ?? [],
      });
      vi.spyOn(element, 'click').mockImplementation(() => {
        if (action.event === 'focus') {
          window.dispatchEvent(new Event('focus'));
        } else {
          element.dispatchEvent(new Event(action.event));
        }
      });
    }
    return element;
  }) as typeof document.createElement);
}

function mockPickedFile(file: { text: () => Promise<string> }): void {
  mockPicker([{ event: 'change', files: [file] }]);
}

describe('webBridge', () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it('settles MIDI picker cancellation, cleans up, and allows retry', async () => {
    const file = new File(['midi'], 'retry.mid', { type: 'audio/midi' });
    const fetchMock = mockFetch(jsonResponse({ songs: [], errors: [], skipped: 0 }));
    mockPicker([
      { event: 'cancel' },
      { event: 'change', files: [file] },
    ]);

    await expect(webBridge.importMidiFiles()).resolves.toEqual({ songs: [], errors: [], skipped: 0 });
    expect(document.querySelectorAll('input')).toHaveLength(0);

    await expect(webBridge.importMidiFiles()).resolves.toEqual({ songs: [], errors: [], skipped: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('settles JSON picker cancellation without importing or leaving input state', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mockPicker([{ event: 'cancel' }]);

    await expect(webBridge.importLibrary()).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('uses window focus as the cancellation fallback', async () => {
    vi.useFakeTimers();
    mockPicker([{ event: 'focus' }]);

    const result = webBridge.importMidiFiles();
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual({ songs: [], errors: [], skipped: 0 });
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('clears browser-local settings after the server reset succeeds', async () => {
    window.localStorage.setItem('pianohero-test', 'present');
    const fetchMock = mockFetch(jsonResponse({ result: null }));

    await expect(webBridge.resetUserData()).resolves.toBeNull();

    expect(window.localStorage.getItem('pianohero-test')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/bridge/resetUserData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args: [] }),
    });
  });
});
