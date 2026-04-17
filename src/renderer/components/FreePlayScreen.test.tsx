import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../../lib/audio/audioEngine';
import type { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, KeyboardInputState } from '../../lib/input/types';
import type { MidiInputService } from '../../lib/midi/midiInputService';
import type { MidiInputDevice } from '../../lib/midi/types';
import { FreePlayScreen } from './FreePlayScreen';

const gradientStub = {
  addColorStop: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  ellipse: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  clip: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 80 })),
  createLinearGradient: vi.fn(() => gradientStub),
  createRadialGradient: vi.fn(() => gradientStub),
})) as never;

class MockMidiInputService {
  private listeners = new Set<(event: InputEvent) => void>();

  private deviceListeners = new Set<(devices: MidiInputDevice[]) => void>();

  subscribe(listener: (event: InputEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeDevices(listener: (devices: MidiInputDevice[]) => void): () => void {
    this.deviceListeners.add(listener);
    listener([]);
    return () => {
      this.deviceListeners.delete(listener);
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
    prepareForPlayback: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
    noteOn: vi.fn().mockResolvedValue(undefined),
    noteOff: vi.fn(),
    setPitchBend: vi.fn(),
    setModulation: vi.fn(),
    setSustain: vi.fn(),
    playMetronomeClick: vi.fn().mockResolvedValue(undefined),
    loadBackingTrack: vi.fn().mockResolvedValue(undefined),
    setBackingTrackVolume: vi.fn(),
    playBackingTrack: vi.fn(),
    pauseBackingTrack: vi.fn(),
    stopBackingTrack: vi.fn(),
    renderRecordingToWav: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  } as unknown as AudioEngine;
}

describe('FreePlayScreen', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.appBridge = {
      getSetting: vi.fn().mockResolvedValue(null),
      pickAudioFile: vi.fn().mockResolvedValue({
        path: 'C:\\Audio\\jam.mp3',
        name: 'jam.mp3',
      }),
      saveMidiFile: vi.fn().mockResolvedValue('C:\\Exports\\free-play.mid'),
      saveWavFile: vi.fn().mockResolvedValue('C:\\Exports\\free-play.wav'),
    } as unknown as typeof window.appBridge;
  });

  it('warms audio on first pointer interaction before note playback', () => {
    const audioEngine = buildAudioEngineStub();

    render(
      <FreePlayScreen
        audioEngine={audioEngine}
        midiInputService={new MockMidiInputService() as unknown as MidiInputService}
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        keyboardOverlaySize="medium"
        postureReminderMinutes={null}
        breakReminderMinutes={null}
        pitchBendEnabled
        onBackToMainMenu={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('main'));

    expect(audioEngine.prepareForPlayback).toHaveBeenCalledTimes(1);
  });

  it('toggles the immersive overlay with Escape', () => {
    render(
      <FreePlayScreen
        audioEngine={buildAudioEngineStub()}
        midiInputService={new MockMidiInputService() as unknown as MidiInputService}
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        keyboardOverlaySize="medium"
        postureReminderMinutes={null}
        breakReminderMinutes={null}
        pitchBendEnabled
        onBackToMainMenu={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    expect(screen.queryByText('Visual Modes')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Visual Modes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ink in Water/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tree of Light/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Particle Galaxy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aurora Borealis/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fireworks/ })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Visual Modes')).not.toBeInTheDocument();
  });

  it('keeps recording and backing-track state when switching visual modes', async () => {
    const midiService = new MockMidiInputService();
    const audioEngine = buildAudioEngineStub();
    const nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValue(1000);

    render(
      <FreePlayScreen
        audioEngine={audioEngine}
        midiInputService={midiService as unknown as MidiInputService}
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        keyboardOverlaySize="medium"
        postureReminderMinutes={null}
        breakReminderMinutes={null}
        pitchBendEnabled
        onBackToMainMenu={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByText('Record'));

    await act(async () => {
      midiService.emit({
        type: 'noteon',
        source: 'midi',
        sourceId: 'controller-1',
        timestamp: 1100,
        note: 60,
        velocity: 0.9,
      });
      midiService.emit({
        type: 'noteoff',
        source: 'midi',
        sourceId: 'controller-1',
        timestamp: 1250,
        note: 60,
        velocity: 0,
      });
    });

    nowSpy.mockReturnValue(1300);
    fireEvent.click(screen.getByText('Stop Recording'));
    fireEvent.click(screen.getByText('Load Track'));

    expect(await screen.findByText('jam.mp3')).toBeInTheDocument();
    expect(screen.getAllByText('1 note').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Ink in Water/ }));

    expect(screen.getByRole('region', { name: 'Ink in Water visualizer' })).toBeInTheDocument();
    expect(screen.getByText('jam.mp3')).toBeInTheDocument();
    expect(screen.getAllByText('1 note').length).toBeGreaterThan(0);
    expect(screen.getByText('Play Recording')).toBeEnabled();

    nowSpy.mockRestore();
  });

  it('visual preset buttons appear in overlay and switching preset does not interrupt recording or backing track', async () => {
    const midiService = new MockMidiInputService();
    const audioEngine = buildAudioEngineStub();
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    render(
      <FreePlayScreen
        audioEngine={audioEngine}
        midiInputService={midiService as unknown as MidiInputService}
        keyboardInputService={new MockKeyboardInputService() as unknown as ComputerKeyboardInputService}
        inputMode="both"
        keyboardOverlaySize="medium"
        postureReminderMinutes={null}
        breakReminderMinutes={null}
        pitchBendEnabled
        onBackToMainMenu={vi.fn()}
        onOpenKeyboardSetup={vi.fn()}
      />,
    );

    // Open overlay
    fireEvent.keyDown(window, { key: 'Escape' });

    // Preset buttons are present
    expect(screen.getByRole('button', { name: 'Subtle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Balanced' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vivid' })).toBeInTheDocument();

    // Start recording and load a backing track
    fireEvent.click(screen.getByText('Record'));
    fireEvent.click(screen.getByText('Load Track'));
    expect(await screen.findByText('jam.mp3')).toBeInTheDocument();

    // Switch preset — should not clear recording or backing track
    fireEvent.click(screen.getByRole('button', { name: 'Vivid' }));
    expect(screen.getByText('jam.mp3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop Recording' })).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByRole('button', { name: 'Subtle' }));
    expect(screen.getByText('jam.mp3')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
