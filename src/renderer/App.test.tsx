import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./components/AchievementToast', () => ({
  AchievementToast: () => null,
}));

vi.mock('./components/MainMenuScreen', () => ({
  MainMenuScreen: ({ onOpenFreePlay }: { onOpenFreePlay: () => void }) => (
    <button onClick={onOpenFreePlay}>Open Free Play</button>
  ),
}));

vi.mock('./components/FreePlayScreen', () => ({
  FreePlayScreen: () => <div>Mock Free Play</div>,
}));

vi.mock('./components/SetupGuideScreen', () => ({
  SetupGuideScreen: () => <div>Setup</div>,
}));

vi.mock('./components/LibraryScreen', () => ({
  LibraryScreen: () => <div>Library</div>,
}));

vi.mock('./components/GameScreen', () => ({
  GameScreen: () => <div>Game</div>,
}));

vi.mock('./components/ResultsScreen', () => ({
  ResultsScreen: () => <div>Results</div>,
}));

vi.mock('./components/TheoryHubScreen', () => ({
  TheoryHubScreen: () => <div>Theory</div>,
}));

vi.mock('./components/ProgressDashboardScreen', () => ({
  ProgressDashboardScreen: () => <div>Progress</div>,
}));

vi.mock('./components/SettingsScreen', () => ({
  SettingsScreen: () => <div>Settings</div>,
}));

vi.mock('./components/ScalePracticeScreen', () => ({
  ScalePracticeScreen: () => <div>Scale</div>,
}));

vi.mock('./components/IntervalTrainerScreen', () => ({
  IntervalTrainerScreen: () => <div>Interval</div>,
}));

vi.mock('./components/TheoryQuizScreen', () => ({
  TheoryQuizScreen: () => <div>Quiz</div>,
}));

vi.mock('./components/KeyboardSetupScreen', () => ({
  KeyboardSetupScreen: () => <div>Keyboard Setup</div>,
}));

vi.mock('../lib/audio/audioEngine', () => ({
  AudioEngine: class {
    setMasterVolume() {}
    setMetronomeVolume() {}
    setReverbLevel() {}
    setInstrument() {
      return Promise.resolve();
    }
    setCustomSampler() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../lib/midi/midiInputService', () => ({
  MidiInputService: class {
    subscribeDevices(listener: (devices: unknown[]) => void) {
      listener([]);
      return () => {};
    }
    init() {
      return Promise.resolve();
    }
    dispose() {}
    setDeviceFilter() {}
  },
}));

vi.mock('../lib/input/computerKeyboardInputService', () => ({
  ComputerKeyboardInputService: class {
    init() {}
    dispose() {}
    setMapping() {}
  },
}));

describe('App', () => {
  beforeEach(() => {
    window.appBridge = {
      getSetting: vi.fn(async (category: string, key: string) => {
        if (category === 'onboarding' && key === 'setupComplete') {
          return 'true';
        }
        if (category === 'visual' && key === 'theme') {
          return 'light';
        }
        return null;
      }),
      setSetting: vi.fn().mockResolvedValue(undefined),
      listAudioFiles: vi.fn().mockResolvedValue([]),
    } as unknown as typeof window.appBridge;
  });

  it('lets free play own Escape and hides the standard app chrome', async () => {
    render(<App />);

    fireEvent.click(await screen.findByText('Open Free Play'));

    expect(screen.getByText('Mock Free Play')).toBeInTheDocument();
    expect(document.querySelector('.app-topbar')).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByText('Mock Free Play')).toBeInTheDocument();
  });
});
