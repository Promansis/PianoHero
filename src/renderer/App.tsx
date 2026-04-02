import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../lib/audio/audioEngine';
import type { GameResult, LoopRange, SessionConfig, SessionMode } from '../lib/game/types';
import { ComputerKeyboardInputService } from '../lib/input/computerKeyboardInputService';
import {
  INPUT_KEYBOARD_MAPPING_SETTING_KEY,
  INPUT_MODE_SETTING_KEY,
  INPUT_SETTINGS_CATEGORY,
  parseInputMode,
  parseKeyboardMapping,
  stringifyKeyboardMapping,
} from '../lib/input/settings';
import type { InputMode } from '../lib/input/types';
import { MidiInputService } from '../lib/midi/midiInputService';
import type { MidiInputDevice } from '../lib/midi/types';
import type { TheorySuggestion } from '../lib/theory/songAnalysis';
import type { SongRow, UserStatsRow } from '../shared/dbTypes';
import { AchievementToast } from './components/AchievementToast';
import { FreePlayScreen } from './components/FreePlayScreen';
import { GameScreen } from './components/GameScreen';
import { IntervalTrainerScreen } from './components/IntervalTrainerScreen';
import { KeyboardSetupScreen } from './components/KeyboardSetupScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ProgressDashboardScreen } from './components/ProgressDashboardScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ScalePracticeScreen } from './components/ScalePracticeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SetupGuideScreen } from './components/SetupGuideScreen';
import { TheoryHubScreen } from './components/TheoryHubScreen';
import { TheoryQuizScreen } from './components/TheoryQuizScreen';

type AppScreen =
  | { screen: 'setup' }
  | { screen: 'library' }
  | { screen: 'free-play' }
  | { screen: 'theory-hub' }
  | { screen: 'progress-dashboard' }
  | { screen: 'settings' }
  | { screen: 'scale-practice'; preset?: { root: number; scaleName: string } }
  | { screen: 'interval-trainer'; preset?: { difficulty: string } }
  | { screen: 'theory-quiz'; preset?: { quizType: string } }
  | { screen: 'keyboard-setup'; returnTo: 'setup' | 'library' | 'settings' }
  | { screen: 'game'; song: SongRow; sessionConfig: SessionConfig; playlistQueue: PlaylistQueue | null }
  | {
      screen: 'results';
      song: SongRow;
      sessionConfig: SessionConfig;
      result: GameResult;
      baselineStats: UserStatsRow | null;
      playlistQueue: PlaylistQueue | null;
      songFilePath: string;
    };

interface PlaylistQueue {
  songs: SongRow[];
  index: number;
}

interface FinishedGamePayload {
  result: GameResult;
  song: SongRow;
  sessionConfig: SessionConfig;
  baselineStats: UserStatsRow | null;
  playlistQueue: PlaylistQueue | null;
}

function buildSessionConfig(mode: SessionMode, overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    mode,
    tempoMultiplier: 1,
    handFilter: 'both',
    loopRange: null,
    waitForInput: mode === 'learning',
    metronomeEnabled: false,
    handSize: 'medium',
    fingeringDisplayMode: 'learning-only',
    ...overrides,
  };
}

export function App() {
  const audioEngineRef = useRef(new AudioEngine());
  const midiServiceRef = useRef<MidiInputService | null>(null);
  const keyboardServiceRef = useRef(new ComputerKeyboardInputService());
  const [midiReady, setMidiReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState('20');
  const [handSize, setHandSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [inputMode, setInputMode] = useState<InputMode>('both');
  const [midiDevices, setMidiDevices] = useState<MidiInputDevice[]>([]);
  const [achievementToastQueue, setAchievementToastQueue] = useState<string[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>({ screen: 'library' });

  useEffect(() => {
    const service = new MidiInputService();
    midiServiceRef.current = service;
    keyboardServiceRef.current.init();

    const unsubscribeDevices = service.subscribeDevices((devices) => {
      setMidiDevices(devices);
    });

    service
      .init()
      .catch(() => {
        // Individual screens surface device errors locally.
      })
      .finally(() => {
        setMidiReady(true);
      });

    return () => {
      unsubscribeDevices();
      service.dispose();
      keyboardServiceRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    const loadAppSettings = async () => {
      if (!window.appBridge) {
        setSettingsReady(true);
        return;
      }

      const [setupComplete, reminder, savedHandSize, rawInputMode, rawKeyboardMapping] = await Promise.all([
        window.appBridge.getSetting('onboarding', 'setupComplete'),
        window.appBridge.getSetting('practice', 'postureReminderMinutes'),
        window.appBridge.getSetting('fingering', 'handSize'),
        window.appBridge.getSetting(INPUT_SETTINGS_CATEGORY, INPUT_MODE_SETTING_KEY),
        window.appBridge.getSetting(INPUT_SETTINGS_CATEGORY, INPUT_KEYBOARD_MAPPING_SETTING_KEY),
      ]);

      if (reminder) {
        setReminderFrequency(reminder);
      }
      if (savedHandSize === 'small' || savedHandSize === 'medium' || savedHandSize === 'large') {
        setHandSize(savedHandSize);
      }

      const nextInputMode = parseInputMode(rawInputMode);
      setInputMode(nextInputMode);
      if (!rawInputMode) {
        void window.appBridge.setSetting(INPUT_SETTINGS_CATEGORY, INPUT_MODE_SETTING_KEY, nextInputMode);
      }

      const parsedMapping = parseKeyboardMapping(rawKeyboardMapping);
      keyboardServiceRef.current.setMapping(parsedMapping);
      if (!rawKeyboardMapping) {
        void window.appBridge.setSetting(
          INPUT_SETTINGS_CATEGORY,
          INPUT_KEYBOARD_MAPPING_SETTING_KEY,
          stringifyKeyboardMapping(parsedMapping),
        );
      }

      setCurrentScreen({ screen: setupComplete === 'true' ? 'library' : 'setup' });
      setSettingsReady(true);
    };

    void loadAppSettings();
  }, []);

  useEffect(() => {
    if (achievementToastQueue.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAchievementToastQueue((current) => current.slice(1));
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [achievementToastQueue]);

  const persistInputMode = (nextMode: InputMode) => {
    setInputMode(nextMode);
    void window.appBridge?.setSetting(INPUT_SETTINGS_CATEGORY, INPUT_MODE_SETTING_KEY, nextMode);
  };

  const persistSetupState = async (setupComplete: boolean) => {
    if (!window.appBridge) {
      return;
    }

    await Promise.all([
      window.appBridge.setSetting('onboarding', 'setupComplete', setupComplete ? 'true' : 'false'),
      window.appBridge.setSetting('practice', 'postureReminderMinutes', reminderFrequency),
      window.appBridge.setSetting('fingering', 'handSize', handSize),
    ]);
  };

  const enqueueAchievementToasts = (achievementIds: string[]) => {
    if (achievementIds.length === 0) {
      return;
    }

    setAchievementToastQueue((current) => [...current, ...achievementIds]);
  };

  const startSongSession = (
    song: SongRow,
    mode: SessionMode,
    loopRange: LoopRange | null = null,
    playlistQueue: PlaylistQueue | null = null,
  ) => {
    setCurrentScreen({
      screen: 'game',
      song,
      sessionConfig: buildSessionConfig(mode, {
        loopRange,
        waitForInput: mode === 'learning',
        handSize,
      }),
      playlistQueue,
    });
  };

  const handleGameFinished = ({ result, song, sessionConfig, baselineStats, playlistQueue }: FinishedGamePayload) => {
    setCurrentScreen({
      screen: 'results',
      song,
      sessionConfig,
      result,
      baselineStats,
      playlistQueue,
      songFilePath: song.filePath,
    });
  };

  const startPlaylistQueue = (songs: SongRow[]) => {
    if (songs.length === 0) {
      return;
    }

    startSongSession(songs[0], 'piano-hero', null, { songs, index: 0 });
  };

  const handleNextQueuedSong = () => {
    if (currentScreen.screen !== 'results' || !currentScreen.playlistQueue) {
      return;
    }

    const nextIndex = currentScreen.playlistQueue.index + 1;
    const nextSong = currentScreen.playlistQueue.songs[nextIndex];
    if (!nextSong) {
      return;
    }

    startSongSession(nextSong, 'piano-hero', null, {
      songs: currentScreen.playlistQueue.songs,
      index: nextIndex,
    });
  };

  const handleStartTheoryPractice = (suggestion?: TheorySuggestion) => {
    if (!suggestion) {
      setCurrentScreen({ screen: 'theory-hub' });
      return;
    }

    if (suggestion.type === 'scale') {
      setCurrentScreen({
        screen: 'scale-practice',
        preset: {
          root: typeof suggestion.params.root === 'number' ? suggestion.params.root : 0,
          scaleName: typeof suggestion.params.scaleName === 'string' ? suggestion.params.scaleName : 'Major',
        },
      });
      return;
    }

    if (suggestion.type === 'interval') {
      setCurrentScreen({
        screen: 'interval-trainer',
        preset: {
          difficulty: typeof suggestion.params.difficulty === 'string' ? suggestion.params.difficulty : 'medium',
        },
      });
      return;
    }

    setCurrentScreen({
      screen: 'theory-quiz',
      preset: {
        quizType: typeof suggestion.params.quizType === 'string' ? suggestion.params.quizType : 'chord',
      },
    });
  };

  const handleBackNavigation = () => {
    switch (currentScreen.screen) {
      case 'setup':
      case 'library':
        return;
      case 'free-play':
      case 'theory-hub':
      case 'progress-dashboard':
      case 'settings':
      case 'results':
        setCurrentScreen({ screen: 'library' });
        return;
      case 'scale-practice':
      case 'interval-trainer':
      case 'theory-quiz':
        setCurrentScreen({ screen: 'theory-hub' });
        return;
      case 'keyboard-setup':
        setCurrentScreen({ screen: currentScreen.returnTo });
        return;
      case 'game':
        setCurrentScreen({ screen: 'library' });
        return;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)),
      );

      if (event.ctrlKey || event.metaKey) {
        if (key === 's') {
          event.preventDefault();
          setCurrentScreen({ screen: 'settings' });
          return;
        }
        if (key === 'p') {
          event.preventDefault();
          setCurrentScreen({ screen: 'progress-dashboard' });
          return;
        }
      }

      if (isTypingTarget) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleBackNavigation();
        return;
      }

      if (event.key === ' ' && currentScreen.screen === 'game') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('pianohero-shortcut', { detail: { action: 'play-pause' } }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentScreen]);

  if (!midiReady || !midiServiceRef.current || !settingsReady) {
    return (
      <main className="app-shell">
        <section className="control-bar panel">
          <p className="eyebrow">Piano Hero</p>
          <h1>Loading services...</h1>
          <p className="song-title">Preparing MIDI, keyboard, audio, and practice settings.</p>
        </section>
      </main>
    );
  }

  const resultsQueue = currentScreen.screen === 'results' ? currentScreen.playlistQueue : null;

  let screenContent: JSX.Element;
  switch (currentScreen.screen) {
    case 'setup':
      screenContent = (
        <SetupGuideScreen
          handSize={handSize}
          reminderFrequency={reminderFrequency}
          onHandSizeChange={setHandSize}
          onReminderFrequencyChange={setReminderFrequency}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'setup' })}
          onSkip={() => {
            void persistSetupState(true);
            setCurrentScreen({ screen: 'library' });
          }}
          onStartPractice={() => {
            void persistSetupState(true);
            setCurrentScreen({ screen: 'library' });
          }}
        />
      );
      break;

    case 'library':
      screenContent = (
        <LibraryScreen
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'library' })}
          onOpenProgressDashboard={() => setCurrentScreen({ screen: 'progress-dashboard' })}
          onOpenSettings={() => setCurrentScreen({ screen: 'settings' })}
          onOpenSetupGuide={() => setCurrentScreen({ screen: 'setup' })}
          onStartFreePlay={() => setCurrentScreen({ screen: 'free-play' })}
          onStartTheoryPractice={() => setCurrentScreen({ screen: 'theory-hub' })}
          onStartSession={(song, mode) => startSongSession(song, mode)}
          onStartPlaylistQueue={startPlaylistQueue}
        />
      );
      break;

    case 'free-play':
      screenContent = (
        <FreePlayScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          onBackToLibrary={() => setCurrentScreen({ screen: 'library' })}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'library' })}
        />
      );
      break;

    case 'theory-hub':
      screenContent = (
        <TheoryHubScreen
          onBack={() => setCurrentScreen({ screen: 'library' })}
          onStartIntervalTrainer={(preset) => setCurrentScreen({ screen: 'interval-trainer', preset })}
          onStartQuiz={(preset) => setCurrentScreen({ screen: 'theory-quiz', preset })}
          onStartScalePractice={(preset) => setCurrentScreen({ screen: 'scale-practice', preset })}
        />
      );
      break;

    case 'progress-dashboard':
      screenContent = <ProgressDashboardScreen onBack={() => setCurrentScreen({ screen: 'library' })} />;
      break;

    case 'settings':
      screenContent = (
        <SettingsScreen
          inputMode={inputMode}
          midiDevices={midiDevices}
          onInputModeChange={persistInputMode}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'settings' })}
          onBack={() => setCurrentScreen({ screen: 'library' })}
        />
      );
      break;

    case 'scale-practice':
      screenContent = (
        <ScalePracticeScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          onBack={() => setCurrentScreen({ screen: 'theory-hub' })}
          onAchievementsUnlocked={enqueueAchievementToasts}
          preset={currentScreen.preset}
        />
      );
      break;

    case 'interval-trainer':
      screenContent = (
        <IntervalTrainerScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          onBack={() => setCurrentScreen({ screen: 'theory-hub' })}
          onAchievementsUnlocked={enqueueAchievementToasts}
          preset={currentScreen.preset}
        />
      );
      break;

    case 'theory-quiz':
      screenContent = (
        <TheoryQuizScreen
          audioEngine={audioEngineRef.current}
          onBack={() => setCurrentScreen({ screen: 'theory-hub' })}
          onAchievementsUnlocked={enqueueAchievementToasts}
          preset={currentScreen.preset}
        />
      );
      break;

    case 'keyboard-setup':
      screenContent = (
        <KeyboardSetupScreen
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          onInputModeChange={persistInputMode}
          onBack={() => setCurrentScreen({ screen: currentScreen.returnTo })}
        />
      );
      break;

    case 'game':
      screenContent = (
        <GameScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          song={currentScreen.song}
          initialSessionConfig={currentScreen.sessionConfig}
          playlistQueue={currentScreen.playlistQueue}
          onBackToLibrary={() => setCurrentScreen({ screen: 'library' })}
          onGameFinished={handleGameFinished}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'library' })}
        />
      );
      break;

    case 'results':
      screenContent = (
        <ResultsScreen
          baselineStats={currentScreen.baselineStats}
          result={currentScreen.result}
          sessionConfig={currentScreen.sessionConfig}
          song={currentScreen.song}
          songFilePath={currentScreen.songFilePath}
          onAchievementsUnlocked={enqueueAchievementToasts}
          onMainMenu={() => setCurrentScreen({ screen: 'library' })}
          onPracticeSections={(loopRange) => startSongSession(currentScreen.song, 'learning', loopRange)}
          onStartTheoryPractice={handleStartTheoryPractice}
          onRetry={() =>
            startSongSession(
              currentScreen.song,
              currentScreen.sessionConfig.mode,
              null,
              currentScreen.playlistQueue,
            )
          }
          hasNextSong={resultsQueue ? resultsQueue.index < resultsQueue.songs.length - 1 : false}
          onNextSong={handleNextQueuedSong}
        />
      );
      break;
  }

  return (
    <>
      {screenContent}
      <AchievementToast
        achievementId={achievementToastQueue[0] ?? null}
        onClose={() => setAchievementToastQueue((current) => current.slice(1))}
      />
    </>
  );
}
