import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryScreen } from './LibraryScreen';

function createAudioEngineStub() {
  return {
    allNotesOff: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    noteOn: vi.fn().mockResolvedValue(undefined),
    noteOff: vi.fn(),
  };
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

    await screen.findByText('Etude');

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
});
