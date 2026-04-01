import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../lib/audio/audioEngine';
import type { GameResult, LoopRange, SessionConfig, SessionMode } from '../lib/game/types';
import { MidiInputService } from '../lib/midi/midiInputService';
import type { SongRow, UserStatsRow } from '../shared/dbTypes';
import { FreePlayScreen } from './components/FreePlayScreen';
import { GameScreen } from './components/GameScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { SetupGuideScreen } from './components/SetupGuideScreen';

type AppScreen =
  | { screen: 'setup' }
  | { screen: 'library' }
  | { screen: 'free-play' }
  | { screen: 'game'; song: SongRow; sessionConfig: SessionConfig }
  | {
      screen: 'results';
      song: SongRow;
      sessionConfig: SessionConfig;
      result: GameResult;
      baselineStats: UserStatsRow | null;
    };

interface FinishedGamePayload {
  result: GameResult;
  song: SongRow;
  sessionConfig: SessionConfig;
  baselineStats: UserStatsRow | null;
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
  const [midiReady, setMidiReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState('20');
  const [handSize, setHandSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>({ screen: 'library' });

  useEffect(() => {
    const service = new MidiInputService();
    midiServiceRef.current = service;

    service
      .init()
      .catch(() => {
        // The individual screens surface device errors in their own status areas.
      })
      .finally(() => {
        setMidiReady(true);
      });

    return () => {
      service.dispose();
    };
  }, []);

  useEffect(() => {
    const loadAppSettings = async () => {
      if (!window.appBridge) {
        setSettingsReady(true);
        return;
      }

      const [setupComplete, reminder, savedHandSize] = await Promise.all([
        window.appBridge.getSetting('onboarding', 'setupComplete'),
        window.appBridge.getSetting('practice', 'postureReminderMinutes'),
        window.appBridge.getSetting('fingering', 'handSize'),
      ]);
      if (reminder) {
        setReminderFrequency(reminder);
      }
      if (savedHandSize === 'small' || savedHandSize === 'medium' || savedHandSize === 'large') {
        setHandSize(savedHandSize);
      }
      setCurrentScreen({ screen: setupComplete === 'true' ? 'library' : 'setup' });
      setSettingsReady(true);
    };

    void loadAppSettings();
  }, []);

  if (!midiReady || !midiServiceRef.current || !settingsReady) {
    return (
      <main className="app-shell">
        <section className="control-bar panel">
          <p className="eyebrow">Piano Hero</p>
          <h1>Loading services...</h1>
          <p className="song-title">Preparing MIDI, audio, and practice settings.</p>
        </section>
      </main>
    );
  }

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

  const startSongSession = (song: SongRow, mode: SessionMode, loopRange: LoopRange | null = null) => {
    setCurrentScreen({
      screen: 'game',
      song,
      sessionConfig: buildSessionConfig(mode, {
        loopRange,
        waitForInput: mode === 'learning',
        handSize,
      }),
    });
  };

  const handleGameFinished = ({ result, song, sessionConfig, baselineStats }: FinishedGamePayload) => {
    setCurrentScreen({
      screen: 'results',
      song,
      sessionConfig,
      result,
      baselineStats,
    });
  };

  switch (currentScreen.screen) {
    case 'setup':
      return (
        <SetupGuideScreen
          handSize={handSize}
          reminderFrequency={reminderFrequency}
          onHandSizeChange={setHandSize}
          onReminderFrequencyChange={setReminderFrequency}
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

    case 'library':
      return (
        <LibraryScreen
          onOpenSetupGuide={() => setCurrentScreen({ screen: 'setup' })}
          onStartFreePlay={() => setCurrentScreen({ screen: 'free-play' })}
          onStartSession={(song, mode) => startSongSession(song, mode)}
        />
      );

    case 'free-play':
      return (
        <FreePlayScreen
          audioEngine={audioEngineRef.current}
          midiInputService={midiServiceRef.current}
          onBackToLibrary={() => setCurrentScreen({ screen: 'library' })}
        />
      );

    case 'game':
      return (
        <GameScreen
          audioEngine={audioEngineRef.current}
          midiInputService={midiServiceRef.current}
          song={currentScreen.song}
          initialSessionConfig={currentScreen.sessionConfig}
          onBackToLibrary={() => setCurrentScreen({ screen: 'library' })}
          onGameFinished={handleGameFinished}
        />
      );

    case 'results':
      return (
        <ResultsScreen
          baselineStats={currentScreen.baselineStats}
          result={currentScreen.result}
          sessionConfig={currentScreen.sessionConfig}
          song={currentScreen.song}
          onMainMenu={() => setCurrentScreen({ screen: 'library' })}
          onPracticeSections={(loopRange) => startSongSession(currentScreen.song, 'learning', loopRange)}
          onRetry={() => startSongSession(currentScreen.song, currentScreen.sessionConfig.mode)}
        />
      );
  }
}
