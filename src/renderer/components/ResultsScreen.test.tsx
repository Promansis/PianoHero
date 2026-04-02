import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen', () => {
  afterEach(() => {
    cleanup();
  });

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    setLineDash: vi.fn(),
  })) as never;

  it('shows Next Song when queue has remaining items', () => {
    render(
      <ResultsScreen
        result={{
          songId: 'song-1',
          score: 1000,
          accuracy: 95,
          maxCombo: 10,
          perfectHits: 10,
          goodHits: 0,
          okHits: 0,
          misses: 0,
          tempo: 1,
          mode: 'piano-hero',
          durationSec: 10,
          measureAccuracy: [],
        }}
        song={{
          id: 'song-1',
          title: 'Prelude',
          artist: '',
          genre: '',
          filePath: '',
          difficulty: 3,
          durationSec: 10,
          bpm: 120,
          noteCount: 20,
          dateAdded: new Date().toISOString(),
          timesPlayed: 0,
          tags: [],
          isFavorite: false,
          folderId: null,
          trackAssignments: {},
        }}
        songFilePath=""
        sessionConfig={{
          mode: 'piano-hero',
          tempoMultiplier: 1,
          handFilter: 'both',
          loopRange: null,
          waitForInput: false,
          metronomeEnabled: false,
          handSize: 'medium',
          fingeringDisplayMode: 'always',
          latencyCompMs: 0,
        }}
        baselineStats={null}
        onRetry={vi.fn()}
        onPracticeSections={vi.fn()}
        onStartTheoryPractice={vi.fn()}
        onMainMenu={vi.fn()}
        hasNextSong
        onNextSong={vi.fn()}
      />,
    );

    expect(screen.getByText('Next Song')).toBeInTheDocument();
  });

  it('calls onNextSong when the button is pressed', () => {
    const onNextSong = vi.fn();

    render(
      <ResultsScreen
        result={{
          songId: 'song-1',
          score: 1000,
          accuracy: 95,
          maxCombo: 10,
          perfectHits: 10,
          goodHits: 0,
          okHits: 0,
          misses: 0,
          tempo: 1,
          mode: 'piano-hero',
          durationSec: 10,
          measureAccuracy: [],
        }}
        song={{
          id: 'song-1',
          title: 'Prelude',
          artist: '',
          genre: '',
          filePath: '',
          difficulty: 3,
          durationSec: 10,
          bpm: 120,
          noteCount: 20,
          dateAdded: new Date().toISOString(),
          timesPlayed: 0,
          tags: [],
          isFavorite: false,
          folderId: null,
          trackAssignments: {},
        }}
        songFilePath=""
        sessionConfig={{
          mode: 'piano-hero',
          tempoMultiplier: 1,
          handFilter: 'both',
          loopRange: null,
          waitForInput: false,
          metronomeEnabled: false,
          handSize: 'medium',
          fingeringDisplayMode: 'always',
          latencyCompMs: 0,
        }}
        baselineStats={null}
        onRetry={vi.fn()}
        onPracticeSections={vi.fn()}
        onStartTheoryPractice={vi.fn()}
        onMainMenu={vi.fn()}
        hasNextSong
        onNextSong={onNextSong}
      />,
    );

    fireEvent.click(screen.getAllByText('Next Song')[0]);

    expect(onNextSong).toHaveBeenCalled();
  });
});
