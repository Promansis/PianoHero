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
});
