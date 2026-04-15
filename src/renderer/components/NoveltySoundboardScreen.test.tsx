import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../../lib/audio/audioEngine';
import type { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, KeyboardInputState } from '../../lib/input/types';
import type { MidiInputService } from '../../lib/midi/midiInputService';
import { NoveltySoundboardScreen } from './NoveltySoundboardScreen';

class MockMidiInputService {
  private listeners = new Set<(event: InputEvent) => void>();

  subscribe(listener: (event: InputEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: InputEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

class MockKeyboardInputService {
  private listeners = new Set<(event: InputEvent) => void>();
  private stateListeners = new Set<(state: KeyboardInputState) => void>();

  subscribe(listener: (event: InputEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeState(listener: (state: KeyboardInputState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getState(): KeyboardInputState {
    return {
      octaveShift: 0,
      mapping: {} as KeyboardInputState['mapping'],
    };
  }
}

function buildAudioEngineStub(): AudioEngine {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    playOneShot: vi.fn().mockResolvedValue(undefined),
  } as unknown as AudioEngine;
}

describe('NoveltySoundboardScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('switches to animal mode, shows credits, and spawns a floating overlay on note trigger', async () => {
    vi.useFakeTimers();
    const midiService = new MockMidiInputService();
    const audioEngine = buildAudioEngineStub();

    render(
      <NoveltySoundboardScreen
        audioEngine={audioEngine}
        midiInputService={midiService as unknown as MidiInputService}
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        keyboardOverlaySize="medium"
        onBackToMainMenu={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Animals/i }));
    expect(screen.getByText('Play animal sounds from the keyboard')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show Credits/i }));
    expect(screen.getByText('Animal sound credits')).toBeInTheDocument();
    expect(screen.getAllByText('Dog').length).toBeGreaterThan(0);

    await act(async () => {
      midiService.emit({
        type: 'noteon',
        source: 'midi',
        sourceId: 'controller-1',
        timestamp: 1000,
        note: 36,
        velocity: 0.9,
      });
    });

    expect(audioEngine.playOneShot).toHaveBeenCalled();
    expect(screen.getByAltText('Dog')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.queryByAltText('Dog')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
