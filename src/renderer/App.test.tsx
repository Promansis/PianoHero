import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../lib/achievements/achievementDefinitions';
import { App } from './App';
import type { AchievementRow } from '../shared/dbTypes';

const preloadSpy = vi.fn(() => Promise.resolve());
const unlockSpy = vi.fn(() => Promise.resolve());
const prepareForPlaybackSpy = vi.fn(() => Promise.resolve());
const setInstrumentReverbPresetSpy = vi.fn();
const unlockAchievementSpy = vi.fn((_achievementId: string) => Promise.resolve());
const setSettingSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('./components/AchievementToast', () => ({
  AchievementToast: () => null,
}));

vi.mock('./components/MainMenuScreen', () => ({
  MainMenuScreen: ({
    onOpenFreePlay,
    onOpenLearn,
    onOpenSoundboard,
    onOpenSettings,
  }: {
    onOpenFreePlay: () => void;
    onOpenLearn: () => void;
    onOpenSoundboard: () => void;
    onOpenSettings: () => void;
  }) => (
    <>
      <button onClick={onOpenFreePlay}>Open Free Play</button>
      <button onClick={onOpenLearn}>Open Learn</button>
      <button onClick={onOpenSoundboard}>Open Soundboard</button>
      <button onClick={onOpenSettings}>Open Settings</button>
    </>
  ),
}));

vi.mock('./components/LearnHubScreen', () => ({
  LearnHubScreen: ({ onOpenLesson }: { onOpenLesson: (lessonId: string) => void }) => (
    <button onClick={() => onOpenLesson('novice-02-finger-numbers')}>Open Lesson</button>
  ),
}));

vi.mock('./components/LessonScreen', () => ({
  LessonScreen: ({ onStartDrill }: { onStartDrill: (lessonId: string, stepIndex: number) => void }) => (
    <>
      <div>Lesson</div>
      <button onClick={() => onStartDrill('novice-02-finger-numbers', 3)}>Start Drill</button>
    </>
  ),
}));

vi.mock('./components/FreePlayScreen', () => ({
  FreePlayScreen: () => <div>Mock Free Play</div>,
}));

vi.mock('./components/NoveltySoundboardScreen', () => ({
  NoveltySoundboardScreen: () => <div>Mock Soundboard</div>,
}));

vi.mock('./components/SetupGuideScreen', () => ({
  SetupGuideScreen: () => <div>Setup</div>,
}));

vi.mock('./components/LibraryScreen', () => ({
  LibraryScreen: () => <div>Library</div>,
}));

vi.mock('./components/GameScreen', () => ({
  GameScreen: ({ onOpenKeyboardSetup }: { onOpenKeyboardSetup: () => void }) => (
    <>
      <div>Game</div>
      <button onClick={onOpenKeyboardSetup}>Open Keyboard Setup</button>
    </>
  ),
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
  SettingsScreen: ({
    onSettingChange,
    onDeveloperUnlockAll,
  }: {
    onSettingChange: (category: string, key: string, value: string) => void;
    onDeveloperUnlockAll: () => Promise<void>;
  }) => (
    <>
      <div>Settings</div>
      <button onClick={() => onSettingChange('visual', 'theme', 'neon')}>Select Neon</button>
      <button onClick={() => void onDeveloperUnlockAll()}>Unlock All Developer Content</button>
    </>
  ),
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
    preload = preloadSpy;
    unlock = unlockSpy;
    prepareForPlayback = prepareForPlaybackSpy;
    init() {
      return Promise.resolve();
    }
    setMasterVolume() {}
    setMetronomeVolume() {}
    setReverbLevel() {}
    setInstrument() {
      return Promise.resolve();
    }
    setInstrumentReverbPreset = setInstrumentReverbPresetSpy;
    setCustomSampler() {
      return Promise.resolve();
    }
    playOneShot() {
      return Promise.resolve();
    }
    setMetronomeSound() {}
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
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    preloadSpy.mockClear();
    unlockSpy.mockClear();
    prepareForPlaybackSpy.mockClear();
    setInstrumentReverbPresetSpy.mockClear();
    unlockAchievementSpy.mockClear();
    setSettingSpy.mockClear();
    const achievements: AchievementRow[] = ACHIEVEMENTS.map((achievement) => ({
      id: achievement.id,
      unlockedAt: null,
    }));
    window.appBridge = {
      getSetting: vi.fn(async (category: string, key: string) => {
        if (category === 'onboarding' && key === 'setupComplete') {
          return 'true';
        }
        if (category === 'visual' && key === 'theme') {
          return 'light';
        }
        if (category === 'audio' && key === 'instrumentReverbPresets') {
          return JSON.stringify({ 'acoustic-piano': 'hall' });
        }
        return null;
      }),
      setSetting: setSettingSpy,
      listAudioFiles: vi.fn().mockResolvedValue([]),
      getAllAchievements: vi.fn(async () =>
        achievements.map((achievement) => ({
          ...achievement,
        })),
      ),
      unlockAchievement: vi.fn(async (achievementId: string) => {
        unlockAchievementSpy(achievementId);
        const achievement = achievements.find((entry) => entry.id === achievementId);
        if (achievement) {
          achievement.unlockedAt = '2026-01-01T00:00:00.000Z';
        }
      }),
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

  it('returns keyboard setup opened from a lesson drill back to that lesson', async () => {
    render(<App />);

    fireEvent.click(await screen.findByText('Open Learn'));
    fireEvent.click(await screen.findByText('Open Lesson'));
    fireEvent.click(await screen.findByText('Start Drill'));
    fireEvent.click(await screen.findByText('Open Keyboard Setup'));
    fireEvent.click(screen.getByText('Back'));

    expect(screen.getByText('Start Drill')).toBeInTheDocument();
    expect(screen.queryByText('Keyboard Setup')).not.toBeInTheDocument();
  });

  it('keeps retrying audio unlock on later user gestures', async () => {
    render(<App />);

    await screen.findByText('Open Free Play');
    expect(screen.queryByText('Enable Audio')).not.toBeInTheDocument();
    const initialPrepareCalls = prepareForPlaybackSpy.mock.calls.length;

    fireEvent.pointerDown(window);
    fireEvent.pointerDown(window);
    fireEvent.keyDown(window, { key: 'a' });

    expect(preloadSpy).not.toHaveBeenCalled();
    expect(unlockSpy).not.toHaveBeenCalled();
    expect(prepareForPlaybackSpy.mock.calls.length).toBeGreaterThan(initialPrepareCalls);
  });

  it('routes the main menu soundboard entry to the dedicated soundboard screen', async () => {
    render(<App />);

    fireEvent.click(await screen.findByText('Open Soundboard'));

    expect(screen.getByText('Mock Soundboard')).toBeInTheDocument();
  });

  it('applies the neon dataset theme when the settings screen selects it', async () => {
    render(<App />);

    fireEvent.click(await screen.findByText('Open Settings'));
    fireEvent.click(screen.getByText('Select Neon'));

    expect(document.documentElement.dataset.theme).toBe('neon');
  });

  it('loads and applies saved per-instrument reverb presets during startup', async () => {
    render(<App />);

    await screen.findByText('Open Free Play');

    expect(setInstrumentReverbPresetSpy).toHaveBeenCalledWith('hall');
  });

  it('unlocks all developer content through the settings action', async () => {
    render(<App />);

    const settingsButtons = await screen.findAllByText('Open Settings');
    fireEvent.click(settingsButtons[settingsButtons.length - 1]);
    fireEvent.click(screen.getByText('Unlock All Developer Content'));

    await waitFor(() => {
      expect(unlockAchievementSpy).toHaveBeenCalledTimes(ACHIEVEMENTS.length);
      expect(setSettingSpy).toHaveBeenCalledWith('learning', 'completedLessons', expect.any(String));
      expect(setSettingSpy).toHaveBeenCalledWith('learning', 'completedSteps', expect.any(String));
      expect(setSettingSpy).toHaveBeenCalledWith('learning', 'gatingEnabled', 'false');
      expect(setSettingSpy).toHaveBeenCalledWith('learning', 'capstoneResults', expect.any(String));
    });
  });
});
