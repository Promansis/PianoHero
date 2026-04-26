import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryScreen } from './LibraryScreen';

function createAudioEngineStub() {
  return {
    allNotesOff: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    noteOn: vi.fn().mockResolvedValue(undefined),
    noteOff: vi.fn(),
  };
}

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches,
    media: '(max-width: 780px)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatch(nextMatches: boolean) {
      this.matches = nextMatches;
      const event = { matches: nextMatches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => mediaQuery),
  });

  return mediaQuery;
}

describe('LibraryScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_WEB', true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          songs: [],
          errors: [{ filename: 'Broken', message: 'Bad header' }],
        }),
      }),
    );

    window.appBridge = {
      getAllSongs: vi.fn().mockResolvedValue([]),
      getAllFolders: vi.fn().mockResolvedValue([]),
      getAllPlaylists: vi.fn().mockResolvedValue([]),
      getRecommendations: vi.fn().mockResolvedValue(null),
      getUserStats: vi.fn().mockResolvedValue(null),
      getSetting: vi.fn().mockResolvedValue(null),
    } as unknown as typeof window.appBridge;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete (window as Window & { matchMedia?: typeof window.matchMedia }).matchMedia;
  });

  it('shows actual web import error messages in the library feedback', async () => {
    const { container } = render(
      <LibraryScreen
        audioEngine={createAudioEngineStub() as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        onStartSession={vi.fn()}
        onStartPlaylistQueue={vi.fn()}
        onStartTheoryPractice={vi.fn()}
      />,
    );

    await screen.findByText('Build your library by importing MIDI files.');

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [new File(['bad-midi'], 'Broken.mid', { type: 'audio/midi' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Broken: Bad header/)).toBeInTheDocument();
    });
  });

  it('uploads selected files even after the input value is cleared', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        songs: [{ songId: 'song-1' }],
        errors: [],
      }),
    } as Response);

    const { container } = render(
      <LibraryScreen
        audioEngine={createAudioEngineStub() as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        onStartSession={vi.fn()}
        onStartPlaylistQueue={vi.fn()}
        onStartTheoryPractice={vi.fn()}
      />,
    );

    await screen.findByText('Build your library by importing MIDI files.');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const selectedFiles = [new File(['midi-data'], 'Etude.mid', { type: 'audio/midi' })];
    let currentFiles = selectedFiles;

    Object.defineProperty(input, 'files', {
      configurable: true,
      get: () => currentFiles,
    });

    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => '',
      set: () => {
        currentFiles = [];
      },
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/midi/upload',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      );
    });
  });

  it('deletes a song from the metadata editor', async () => {
    const bulkDeleteSongs = vi.fn().mockResolvedValue(undefined);
    const song = {
      id: 'song-1',
      title: 'Etude',
      artist: 'Composer',
      genre: 'Classical',
      difficulty: 4,
      durationSec: 120,
      bpm: 120,
      noteCount: 240,
      filePath: '/tmp/etude.mid',
      dateAdded: '2026-04-18T00:00:00.000Z',
      lastPlayed: null,
      timesPlayed: 0,
      isFavorite: false,
      folderId: null,
      tags: [],
      trackAssignments: {},
    };

    window.appBridge = {
      getAllSongs: vi.fn().mockResolvedValueOnce([song]).mockResolvedValue([]),
      getAllFolders: vi.fn().mockResolvedValue([]),
      getAllPlaylists: vi.fn().mockResolvedValue([]),
      getRecommendations: vi.fn().mockResolvedValue(null),
      getUserStats: vi.fn().mockResolvedValue(null),
      getSetting: vi.fn().mockResolvedValue(null),
      bulkDeleteSongs,
    } as unknown as typeof window.appBridge;

    render(
      <LibraryScreen
        audioEngine={createAudioEngineStub() as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        onStartSession={vi.fn()}
        onStartPlaylistQueue={vi.fn()}
        onStartTheoryPractice={vi.fn()}
      />,
    );

    await screen.findByText('1 song ready to play.');

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Metadata' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Song' }));

    await waitFor(() => {
      expect(bulkDeleteSongs).toHaveBeenCalledWith(['song-1']);
    });

    await waitFor(() => {
      expect(screen.queryByText('Metadata Review')).not.toBeInTheDocument();
      expect(screen.getByText('Deleted 1 song from the library.')).toBeInTheDocument();
    });
  });

  it('defaults to list mode with closed mobile disclosures on compact layouts', async () => {
    mockMatchMedia(true);
    const song = {
      id: 'song-1',
      title: 'Etude',
      artist: 'Composer',
      genre: 'Classical',
      difficulty: 4,
      durationSec: 120,
      bpm: 120,
      noteCount: 240,
      filePath: '/tmp/etude.mid',
      dateAdded: '2026-04-18T00:00:00.000Z',
      lastPlayed: null,
      timesPlayed: 0,
      isFavorite: false,
      folderId: null,
      tags: [],
      trackAssignments: {},
    };

    window.appBridge = {
      getAllSongs: vi.fn().mockResolvedValue([song]),
      getAllFolders: vi.fn().mockResolvedValue([]),
      getAllPlaylists: vi.fn().mockResolvedValue([]),
      getRecommendations: vi.fn().mockResolvedValue({
        nextChallenge: [{ song, reason: 'Push into a slightly harder run.' }],
        skillBuilder: [],
        youMightLike: [],
        revisit: [{ song, reason: 'Revisit a recent piece.' }],
      }),
      getUserStats: vi.fn().mockResolvedValue(null),
      getSetting: vi.fn().mockResolvedValue(null),
    } as unknown as typeof window.appBridge;

    const { container } = render(
      <LibraryScreen
        audioEngine={createAudioEngineStub() as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        onStartSession={vi.fn()}
        onStartPlaylistQueue={vi.fn()}
        onStartTheoryPractice={vi.fn()}
      />,
    );

    await screen.findByText('1 song ready to play.');

    expect(screen.queryByRole('button', { name: 'Grid' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument();
    expect(container.querySelector('.song-list')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Show Collections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Suggestions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Plan' })).toBeInTheDocument();
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Challenge')).not.toBeInTheDocument();
    expect(screen.queryByText('A ready-made routine for your next practice slot.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Collections' }));
    expect(screen.getByText('Favorites')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Suggestions' }));
    expect(screen.getByText('Next Challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Plan' }));
    expect(screen.getByText('A ready-made routine for your next practice slot.')).toBeInTheDocument();
  });

  it('keeps recommendations and the practice plan expanded on desktop layouts', async () => {
    mockMatchMedia(false);
    const song = {
      id: 'song-1',
      title: 'Etude',
      artist: 'Composer',
      genre: 'Classical',
      difficulty: 4,
      durationSec: 120,
      bpm: 120,
      noteCount: 240,
      filePath: '/tmp/etude.mid',
      dateAdded: '2026-04-18T00:00:00.000Z',
      lastPlayed: null,
      timesPlayed: 0,
      isFavorite: false,
      folderId: null,
      tags: [],
      trackAssignments: {},
    };

    window.appBridge = {
      getAllSongs: vi.fn().mockResolvedValue([song]),
      getAllFolders: vi.fn().mockResolvedValue([]),
      getAllPlaylists: vi.fn().mockResolvedValue([]),
      getRecommendations: vi.fn().mockResolvedValue({
        nextChallenge: [{ song, reason: 'Push into a slightly harder run.' }],
        skillBuilder: [],
        youMightLike: [],
        revisit: [{ song, reason: 'Revisit a recent piece.' }],
      }),
      getUserStats: vi.fn().mockResolvedValue(null),
      getSetting: vi.fn().mockResolvedValue(null),
    } as unknown as typeof window.appBridge;

    render(
      <LibraryScreen
        audioEngine={createAudioEngineStub() as unknown as import('../../lib/audio/audioEngine').AudioEngine}
        onStartSession={vi.fn()}
        onStartPlaylistQueue={vi.fn()}
        onStartTheoryPractice={vi.fn()}
      />,
    );

    await screen.findByText('1 song ready to play.');

    expect(screen.queryByRole('button', { name: 'Show Collections' })).not.toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Suggestions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Plan' })).toBeInTheDocument();
    expect(screen.getByText('Next Challenge')).toBeInTheDocument();
    expect(screen.getByText('A ready-made routine for your next practice slot.')).toBeInTheDocument();
  });
});
