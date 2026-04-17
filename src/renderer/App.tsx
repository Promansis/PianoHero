import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../lib/audio/audioEngine';
import { DEFAULT_INSTRUMENT_ID, DEFAULT_WEB_INSTRUMENT_ID, isInstrumentId } from '../lib/audio/instrumentCatalog';
import { CURRICULUM, getLessonById, getTierByLessonId } from '../lib/learning/curriculum';
import { buildLessonDrill } from '../lib/learning/drillGenerator';
import {
  EMPTY_LEARNING_PROGRESS,
  loadLearningProgress,
  markLessonCompleted,
  markLessonStepCompleted,
  recordCapstoneResult,
  saveLearningProgress,
  setLearningGating,
} from '../lib/learning/learningProgress';
import type { LearningProgress, LearningTierId } from '../lib/learning/types';
import type { GameResult, LoopRange, ParsedSong, SessionConfig, SessionMode } from '../lib/game/types';
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
import { parseMidiFile } from '../lib/midi/midiFileParser';
import { MidiInputService } from '../lib/midi/midiInputService';
import type { MidiInputDevice } from '../lib/midi/types';
import type { TheorySuggestion } from '../lib/theory/songAnalysis';
import type { SongRow, UserStatsRow } from '../shared/dbTypes';
import { AchievementToast } from './components/AchievementToast';
import { FreePlayScreen } from './components/FreePlayScreen';
import { GameScreen } from './components/GameScreen';
import { IntervalTrainerScreen } from './components/IntervalTrainerScreen';
import { KeyboardSetupScreen } from './components/KeyboardSetupScreen';
import { LearnHubScreen } from './components/LearnHubScreen';
import { LessonScreen } from './components/LessonScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { MainMenuScreen } from './components/MainMenuScreen';
import { NoveltySoundboardScreen } from './components/NoveltySoundboardScreen';
import { ProgressDashboardScreen } from './components/ProgressDashboardScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ScalePracticeScreen } from './components/ScalePracticeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SetupGuideScreen } from './components/SetupGuideScreen';
import { TheoryHubScreen } from './components/TheoryHubScreen';
import { TheoryQuizScreen } from './components/TheoryQuizScreen';

type LessonReturnTarget = { lessonId: string; stepIndex: number };
type KeyboardSetupReturnTarget = 'setup' | 'library' | 'settings' | 'free-play' | 'soundboard' | LessonReturnTarget;

type AppScreen =
  | { screen: 'setup' }
  | { screen: 'main-menu' }
  | { screen: 'library' }
  | { screen: 'learn-hub' }
  | { screen: 'lesson'; lessonId: string; stepIndex?: number }
  | { screen: 'free-play' }
  | { screen: 'soundboard' }
  | { screen: 'theory-hub' }
  | { screen: 'progress-dashboard' }
  | { screen: 'settings' }
  | { screen: 'scale-practice'; preset?: { root: number; scaleName: string }; returnTo?: LessonReturnTarget }
  | { screen: 'interval-trainer'; preset?: { difficulty: string }; returnTo?: LessonReturnTarget }
  | { screen: 'theory-quiz'; preset?: { quizType: string }; returnTo?: LessonReturnTarget }
  | { screen: 'keyboard-setup'; returnTo: KeyboardSetupReturnTarget }
  | { screen: 'game'; song: SongRow; sessionConfig: SessionConfig; playlistQueue: PlaylistQueue | null }
  | { screen: 'lesson-drill'; lessonId: string; stepIndex: number; parsedSong: ParsedSong; sessionConfig: SessionConfig }
  | { screen: 'capstone'; tierId: string; parsedSong: ParsedSong; sessionConfig: SessionConfig }
  | {
      screen: 'results';
      song: SongRow;
      sessionConfig: SessionConfig;
      result: GameResult;
      baselineStats: UserStatsRow | null;
      playlistQueue: PlaylistQueue | null;
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

function buildSessionConfig(
  mode: SessionMode,
  waitModeDefault: boolean,
  metronomeDefault: boolean,
  latencyCompMs: number,
  hitWindowMs: number,
  beatsVisible: number,
  leadInBeats: number,
  overrides: Partial<SessionConfig> = {},
): SessionConfig {
  return {
    mode,
    tempoMultiplier: 1,
    handFilter: 'both',
    loopRange: null,
    waitForInput: waitModeDefault || mode === 'learning',
    metronomeEnabled: metronomeDefault,
    handSize: 'medium',
    fingeringDisplayMode: 'learning-only',
    latencyCompMs,
    hitWindowMs,
    beatsVisible,
    leadInBeats,
    ...overrides,
  };
}

function parseStoredAudioNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Parses sample filenames into Tone.js note names.
// Supports Salamander style (Ds1.mp3 -> D#1) and standard style (C#4.mp3 -> C#4).
function extractNoteName(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '');
  const salamander = /^([A-G])s(\d)$/.exec(base);
  if (salamander) {
    return `${salamander[1]}#${salamander[2]}`;
  }
  const standard = /^([A-G][#b]?\d{1,2})$/.exec(base);
  if (standard) {
    return standard[1];
  }
  return null;
}

function getScreenTitle(currentScreen: AppScreen): string {
  switch (currentScreen.screen) {
    case 'setup':
      return 'Setup';
    case 'main-menu':
      return 'Main Menu';
    case 'library':
      return 'Song Library';
    case 'learn-hub':
      return 'Learn';
    case 'lesson':
      return 'Lesson';
    case 'free-play':
      return 'Free Play';
    case 'soundboard':
      return 'Soundboard';
    case 'theory-hub':
      return 'Theory';
    case 'progress-dashboard':
      return 'Progress';
    case 'settings':
      return 'Settings';
    case 'scale-practice':
      return 'Scale Practice';
    case 'interval-trainer':
      return 'Interval Trainer';
    case 'theory-quiz':
      return 'Theory Quiz';
    case 'keyboard-setup':
      return 'Keyboard Setup';
    case 'game':
      return 'In Game';
    case 'lesson-drill':
      return 'Lesson Drill';
    case 'capstone':
      return 'Tier Capstone';
    case 'results':
      return 'Results';
  }
}

function isLessonReturnTarget(value: KeyboardSetupReturnTarget): value is LessonReturnTarget {
  return typeof value === 'object' && value !== null && 'lessonId' in value && 'stepIndex' in value;
}

export function App() {
  const audioEngineRef = useRef(new AudioEngine());
  const midiServiceRef = useRef<MidiInputService | null>(null);
  const keyboardServiceRef = useRef(new ComputerKeyboardInputService());
  const [midiReady, setMidiReady] = useState(false);
  const [midiError, setMidiError] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [handSize, setHandSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [inputMode, setInputMode] = useState<InputMode>('both');
  const [midiDevices, setMidiDevices] = useState<MidiInputDevice[]>([]);
  const [achievementToastQueue, setAchievementToastQueue] = useState<string[]>([]);
  const [showDailyGoalToast, setShowDailyGoalToast] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>({ screen: 'main-menu' });
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [noteLabels, setNoteLabels] = useState<'alphabetic' | 'symbols' | 'both' | 'none'>('alphabetic');
  const [noteLabelSize, setNoteLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [keyboardOverlaySize, setKeyboardOverlaySize] = useState<'small' | 'medium' | 'large'>('medium');
  const [latencyCompMs, setLatencyCompMs] = useState(0);
  const [waitModeDefault, setWaitModeDefault] = useState(false);
  const [metronomeDefault, setMetronomeDefault] = useState(false);
  const [hitWindowMs, setHitWindowMs] = useState(100);
  const [beatsVisible, setBeatsVisible] = useState(8);
  const [leadInBeats, setLeadInBeats] = useState(2);
  const [postureReminderMinutes, setPostureReminderMinutes] = useState<number | null>(null);
  const [breakReminderMinutes, setBreakReminderMinutes] = useState<number | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress>(EMPTY_LEARNING_PROGRESS);

  useEffect(() => {
    const service = new MidiInputService();
    midiServiceRef.current = service;
    keyboardServiceRef.current.init();

    const unsubscribeDevices = service.subscribeDevices((devices) => {
      setMidiDevices(devices);
    });

    const tryInit = () => {
      service
        .init()
        .then(() => {
          setMidiError(false);
        })
        .catch(() => {
          setMidiError(true);
        })
        .finally(() => {
          setMidiReady(true);
        });
    };

    tryInit();

    // Auto-retry when the browser grants the midi permission (e.g. user
    // allows via site settings after the initial prompt was dismissed).
    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => {
      if (permissionStatus?.state === 'granted') {
        setMidiError(false);
        service.init().then(() => setMidiError(false)).catch(() => {});
      }
    };

    if (typeof navigator.permissions?.query === 'function') {
      navigator.permissions
        .query({ name: 'midi' as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.addEventListener('change', handlePermissionChange);
        })
        .catch(() => {});
    }

    return () => {
      permissionStatus?.removeEventListener('change', handlePermissionChange);
      unsubscribeDevices();
      service.dispose();
      keyboardServiceRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    const prepareAudio = async () => {
      try {
        await audioEngineRef.current.prepareForPlayback();
      } catch {
        // A later user gesture will retry if the browser still blocks audio.
      }
    };

    window.addEventListener('pointerdown', prepareAudio, { capture: true });
    window.addEventListener('keydown', prepareAudio, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', prepareAudio, true);
      window.removeEventListener('keydown', prepareAudio, true);
    };
  }, []);

  useEffect(() => {
    const loadAppSettings = async () => {
      if (!window.appBridge) {
        setSettingsReady(true);
        return;
      }

      const [
        setupComplete,
        reminder,
        savedHandSize,
        rawInputMode,
        rawKeyboardMapping,
        rawInstrumentId,
        rawMasterVolume,
        rawMetronomeVolume,
        rawReverbLevel,
        rawTheme,
        rawColorBlind,
        rawNoteLabels,
        rawKeyboardSize,
        rawLatencyComp,
        rawWaitMode,
        rawMetronomeDefault,
        rawBreakReminder,
        rawMidiDeviceId,
        rawCustomSamplePath,
        rawHitWindow,
        rawBeatsVisible,
        rawLeftHandColor,
        rawRightHandColor,
        rawMetronomeSound,
        rawLeadInBeats,
        rawNoteLabelSize,
      ] = await Promise.all([
        window.appBridge.getSetting('onboarding', 'setupComplete'),
        window.appBridge.getSetting('practice', 'postureReminderMinutes'),
        window.appBridge.getSetting('fingering', 'handSize'),
        window.appBridge.getSetting(INPUT_SETTINGS_CATEGORY, INPUT_MODE_SETTING_KEY),
        window.appBridge.getSetting(INPUT_SETTINGS_CATEGORY, INPUT_KEYBOARD_MAPPING_SETTING_KEY),
        window.appBridge.getSetting('audio', 'instrumentId'),
        window.appBridge.getSetting('audio', 'masterVolume'),
        window.appBridge.getSetting('audio', 'metronomeVolume'),
        window.appBridge.getSetting('audio', 'reverbLevel'),
        window.appBridge.getSetting('visual', 'theme'),
        window.appBridge.getSetting('visual', 'colorBlindMode'),
        window.appBridge.getSetting('visual', 'noteLabels'),
        window.appBridge.getSetting('visual', 'keyboardOverlaySize'),
        window.appBridge.getSetting('audio', 'latencyCompMs'),
        window.appBridge.getSetting('gameplay', 'waitModeDefault'),
        window.appBridge.getSetting('gameplay', 'metronomeDefault'),
        window.appBridge.getSetting('practice', 'breakReminderMinutes'),
        window.appBridge.getSetting('input', 'midiDeviceId'),
        window.appBridge.getSetting('audio', 'customSamplePackPath'),
        window.appBridge.getSetting('gameplay', 'hitWindowMs'),
        window.appBridge.getSetting('visual', 'beatsVisible'),
        window.appBridge.getSetting('visual', 'leftHandColor'),
        window.appBridge.getSetting('visual', 'rightHandColor'),
        window.appBridge.getSetting('audio', 'metronomeSound'),
        window.appBridge.getSetting('gameplay', 'leadInBeats'),
        window.appBridge.getSetting('visual', 'noteLabelSize'),
      ]);

      if (reminder) {
        const parsed = Number(reminder);
        if (Number.isFinite(parsed) && parsed > 0) {
          setPostureReminderMinutes(parsed);
        }
      }
      if (savedHandSize === 'small' || savedHandSize === 'medium' || savedHandSize === 'large') {
        setHandSize(savedHandSize);
      }

      const theme = rawTheme === 'warm' ? 'warm' : rawTheme === 'light' ? 'light' : 'dark';
      document.documentElement.dataset['theme'] = theme;
      if (!rawTheme) {
        void window.appBridge.setSetting('visual', 'theme', theme);
      }

      setColorBlindMode(rawColorBlind === 'true');

      if (rawNoteLabels === 'alphabetic' || rawNoteLabels === 'symbols' || rawNoteLabels === 'both' || rawNoteLabels === 'none') {
        setNoteLabels(rawNoteLabels);
      }

      if (rawKeyboardSize === 'small' || rawKeyboardSize === 'large') {
        setKeyboardOverlaySize(rawKeyboardSize);
      }

      const parsedLatency = Number(rawLatencyComp);
      if (Number.isFinite(parsedLatency)) {
        setLatencyCompMs(parsedLatency);
      }

      setWaitModeDefault(rawWaitMode === 'true');
      setMetronomeDefault(rawMetronomeDefault === 'true');

      const parsedBreak = Number(rawBreakReminder);
      if (Number.isFinite(parsedBreak) && parsedBreak > 0) {
        setBreakReminderMinutes(parsedBreak);
      }

      if (rawMidiDeviceId && midiServiceRef.current) {
        midiServiceRef.current.setDeviceFilter(rawMidiDeviceId);
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

      const defaultInstrumentId = IS_WEB ? DEFAULT_WEB_INSTRUMENT_ID : DEFAULT_INSTRUMENT_ID;
      const initialInstrumentId = isInstrumentId(rawInstrumentId) ? rawInstrumentId : defaultInstrumentId;
      audioEngineRef.current.setMasterVolume(parseStoredAudioNumber(rawMasterVolume, 80));
      audioEngineRef.current.setMetronomeVolume(parseStoredAudioNumber(rawMetronomeVolume, 65));
      audioEngineRef.current.setReverbLevel(parseStoredAudioNumber(rawReverbLevel, 20));
      void audioEngineRef.current.setInstrument(initialInstrumentId);

      if (!IS_WEB && rawCustomSamplePath) {
        void (async () => {
          const files = await window.appBridge!.listAudioFiles(rawCustomSamplePath);
          const urls: Record<string, string> = {};
          for (const file of files) {
            const noteName = extractNoteName(file);
            if (noteName) {
              urls[noteName] = file;
            }
          }
          if (Object.keys(urls).length > 0) {
            const baseUrl = 'file:///' + rawCustomSamplePath.replace(/\\/g, '/').replace(/\/?$/, '/');
            await audioEngineRef.current.setCustomSampler(urls, baseUrl);
          }
        })();
      }

      if (!rawInstrumentId) {
        void window.appBridge.setSetting('audio', 'instrumentId', initialInstrumentId);
      }

      const parsedHitWindow = Number(rawHitWindow);
      if (Number.isFinite(parsedHitWindow) && parsedHitWindow > 0) {
        setHitWindowMs(parsedHitWindow);
      }

      const parsedBeatsVisible = Number(rawBeatsVisible);
      if (Number.isFinite(parsedBeatsVisible) && parsedBeatsVisible > 0) {
        setBeatsVisible(parsedBeatsVisible);
      }

      const parsedLeadIn = Number(rawLeadInBeats);
      if (Number.isFinite(parsedLeadIn) && parsedLeadIn >= 0) {
        setLeadInBeats(Math.round(parsedLeadIn));
      }

      if (rawNoteLabelSize === 'small' || rawNoteLabelSize === 'large') {
        setNoteLabelSize(rawNoteLabelSize);
      }

      if (rawLeftHandColor) {
        document.documentElement.style.setProperty('--hand-left-color', rawLeftHandColor);
      }
      if (rawRightHandColor) {
        document.documentElement.style.setProperty('--hand-right-color', rawRightHandColor);
      }

      if (rawMetronomeSound) {
        audioEngineRef.current.setMetronomeSound(rawMetronomeSound);
      }

      setCurrentScreen({ screen: setupComplete === 'true' ? 'main-menu' : 'setup' });
      setSettingsReady(true);
    };

    void loadAppSettings();
  }, []);

  useEffect(() => {
    void loadLearningProgress(window.appBridge).then((progress) => {
      setLearningProgress(progress);
    });
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

  const retryMidiInit = () => {
    if (!midiServiceRef.current) {
      return;
    }
    midiServiceRef.current
      .init()
      .then(() => setMidiError(false))
      .catch(() => setMidiError(true));
  };

  const applySettingChange = (category: string, key: string, value: string) => {
    if (category === 'audio') {
      if (key === 'instrumentId') {
        void audioEngineRef.current.setInstrument(isInstrumentId(value) ? value : DEFAULT_INSTRUMENT_ID);
        return;
      }
      if (key === 'customSamplePackPath') {
        if (IS_WEB) {
          return;
        }
        if (!value) {
          return;
        }
        void (async () => {
          const files = await window.appBridge?.listAudioFiles(value) ?? [];
          const urls: Record<string, string> = {};
          for (const file of files) {
            const noteName = extractNoteName(file);
            if (noteName) {
              urls[noteName] = file;
            }
          }
          if (Object.keys(urls).length > 0) {
            const baseUrl = 'file:///' + value.replace(/\\/g, '/').replace(/\/?$/, '/');
            await audioEngineRef.current.setCustomSampler(urls, baseUrl);
          }
        })();
        return;
      }
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue)) {
        return;
      }
      if (key === 'masterVolume') {
        audioEngineRef.current.setMasterVolume(parsedValue);
      } else if (key === 'metronomeVolume') {
        audioEngineRef.current.setMetronomeVolume(parsedValue);
      } else if (key === 'reverbLevel') {
        audioEngineRef.current.setReverbLevel(parsedValue);
      } else if (key === 'latencyCompMs') {
        setLatencyCompMs(parsedValue);
      }
      return;
    }

    if (category === 'visual') {
      if (key === 'theme') {
        document.documentElement.dataset['theme'] = value === 'warm' ? 'warm' : value === 'dark' ? 'dark' : 'light';
      } else if (key === 'colorBlindMode') {
        setColorBlindMode(value === 'true');
      } else if (key === 'noteLabels' && (value === 'alphabetic' || value === 'symbols' || value === 'both' || value === 'none')) {
        setNoteLabels(value);
      } else if (key === 'keyboardOverlaySize' && (value === 'small' || value === 'medium' || value === 'large')) {
        setKeyboardOverlaySize(value);
      } else if (key === 'noteLabelSize' && (value === 'small' || value === 'medium' || value === 'large')) {
        setNoteLabelSize(value);
      }
      return;
    }

    if (category === 'gameplay') {
      if (key === 'waitModeDefault') {
        setWaitModeDefault(value === 'true');
      } else if (key === 'metronomeDefault') {
        setMetronomeDefault(value === 'true');
      } else if (key === 'hitWindowMs') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          setHitWindowMs(parsed);
        }
      } else if (key === 'leadInBeats') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) {
          setLeadInBeats(Math.round(parsed));
        }
      }
      return;
    }

    if (category === 'practice') {
      if (key === 'postureReminderMinutes') {
        const parsed = Number(value);
        setPostureReminderMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      } else if (key === 'breakReminderMinutes') {
        const parsed = Number(value);
        setBreakReminderMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
      }
      return;
    }

    if (category === 'visual' && key === 'beatsVisible') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        setBeatsVisible(parsed);
      }
      return;
    }

    if (category === 'visual' && (key === 'leftHandColor' || key === 'rightHandColor')) {
      const prop = key === 'leftHandColor' ? '--hand-left-color' : '--hand-right-color';
      if (value) {
        document.documentElement.style.setProperty(prop, value);
      } else {
        document.documentElement.style.removeProperty(prop);
      }
      return;
    }

    if (category === 'audio' && key === 'metronomeSound') {
      audioEngineRef.current.setMetronomeSound(value);
      return;
    }

    if (category === 'input' && key === 'midiDeviceId') {
      midiServiceRef.current?.setDeviceFilter(value || null);
    }
  };

  const persistSetupState = async (setupComplete: boolean) => {
    if (!window.appBridge) {
      return;
    }

    await Promise.all([
      window.appBridge.setSetting('onboarding', 'setupComplete', setupComplete ? 'true' : 'false'),
      window.appBridge.setSetting('practice', 'postureReminderMinutes', postureReminderMinutes !== null ? String(postureReminderMinutes) : 'off'),
      window.appBridge.setSetting('fingering', 'handSize', handSize),
    ]);
  };

  const enqueueAchievementToasts = (achievementIds: string[]) => {
    if (achievementIds.length === 0) {
      return;
    }

    setAchievementToastQueue((current) => [...current, ...achievementIds]);
  };

  const handleDailyGoalReached = () => {
    setShowDailyGoalToast(true);
    window.setTimeout(() => setShowDailyGoalToast(false), 5000);
  };

  const [showSongGoalToast, setShowSongGoalToast] = useState(false);
  const handleSongGoalReached = () => {
    setShowSongGoalToast(true);
    window.setTimeout(() => setShowSongGoalToast(false), 5000);
  };

  const updateLearningProgressState = (updater: (current: LearningProgress) => LearningProgress) => {
    setLearningProgress((current) => {
      const next = updater(current);
      void saveLearningProgress(window.appBridge, next);
      return next;
    });
  };

  const navigateToLesson = (lessonId: string, stepIndex?: number) => {
    setCurrentScreen({ screen: 'lesson', lessonId, stepIndex });
  };

  const handleCompleteLessonStep = (lessonId: string, stepIndex: number) => {
    updateLearningProgressState((current) => markLessonStepCompleted(current, lessonId, stepIndex));
  };

  const handleCompleteLesson = (lessonId: string) => {
    updateLearningProgressState((current) => markLessonCompleted(current, lessonId));
  };

  const handleLearningSessionResult = (lessonId: string, stepIndex: number, accuracy: number) => {
    const lesson = getLessonById(lessonId);
    const step = lesson?.steps[stepIndex];
    if (!lesson || !step) {
      navigateToLesson(lessonId, stepIndex);
      return;
    }

    const passAccuracy = step.kind === 'tip' ? 100 : step.passAccuracy ?? 70;
    const passed = accuracy >= passAccuracy;
    if (passed) {
      updateLearningProgressState((current) => markLessonStepCompleted(current, lessonId, stepIndex));
    }

    navigateToLesson(
      lessonId,
      passed ? Math.min(stepIndex + 1, Math.max(0, lesson.steps.length - 1)) : stepIndex,
    );
  };

  const startLessonDrill = (lessonId: string, stepIndex: number) => {
    const lesson = getLessonById(lessonId);
    const step = lesson?.steps[stepIndex];
    if (!lesson || !step || step.kind !== 'drill') {
      return;
    }

    setCurrentScreen({
      screen: 'lesson-drill',
      lessonId,
      stepIndex,
      parsedSong: buildLessonDrill(step.title, step.drill),
      sessionConfig: buildSessionConfig('learning', true, false, latencyCompMs, hitWindowMs, beatsVisible, leadInBeats, {
        handSize,
        tempoMultiplier: step.tempoMultiplier ?? 1,
        handFilter: step.handFilter ?? 'both',
      }),
    });
  };

  const startCapstone = async (tierId: string) => {
    const tier = CURRICULUM.find((t) => t.id === tierId);
    if (!tier?.capstone || !window.appBridge) return;
    const { capstone } = tier;
    try {
      const bytes = await window.appBridge.loadCurriculumMidi(capstone.songFileName);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const parsedSong = parseMidiFile(ab, { songId: `capstone-${tierId}`, title: capstone.displayTitle });
      setCurrentScreen({
        screen: 'capstone',
        tierId,
        parsedSong,
        sessionConfig: buildSessionConfig('learning', false, metronomeDefault, latencyCompMs, hitWindowMs, beatsVisible, leadInBeats, {
          handSize,
          tempoMultiplier: capstone.tempoPercent / 100,
          handFilter: capstone.handFilter,
        }),
      });
    } catch (err) {
      console.error('Failed to load capstone MIDI:', err);
    }
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
      sessionConfig: buildSessionConfig(mode, waitModeDefault, metronomeDefault, latencyCompMs, hitWindowMs, beatsVisible, leadInBeats, {
        loopRange,
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
      case 'main-menu':
        return;
      case 'library':
      case 'free-play':
      case 'soundboard':
      case 'theory-hub':
      case 'progress-dashboard':
      case 'settings':
      case 'results':
      case 'learn-hub':
        setCurrentScreen({ screen: 'main-menu' });
        return;
      case 'lesson':
        setCurrentScreen({ screen: 'learn-hub' });
        return;
      case 'scale-practice':
      case 'interval-trainer':
      case 'theory-quiz':
        if (currentScreen.returnTo) {
          setCurrentScreen({ screen: 'lesson', lessonId: currentScreen.returnTo.lessonId, stepIndex: currentScreen.returnTo.stepIndex });
          return;
        }
        setCurrentScreen({ screen: 'theory-hub' });
        return;
      case 'keyboard-setup':
        if (isLessonReturnTarget(currentScreen.returnTo)) {
          setCurrentScreen({ screen: 'lesson', lessonId: currentScreen.returnTo.lessonId, stepIndex: currentScreen.returnTo.stepIndex });
          return;
        }
        setCurrentScreen({ screen: currentScreen.returnTo });
        return;
      case 'game':
        setCurrentScreen({ screen: 'main-menu' });
        return;
      case 'lesson-drill':
        setCurrentScreen({ screen: 'lesson', lessonId: currentScreen.lessonId, stepIndex: currentScreen.stepIndex });
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

      if (event.key === 'Escape' && currentScreen.screen !== 'game' && currentScreen.screen !== 'free-play' && currentScreen.screen !== 'lesson-drill' && currentScreen.screen !== 'capstone') {
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
          reminderFrequency={postureReminderMinutes !== null ? String(postureReminderMinutes) : 'off'}
          onHandSizeChange={setHandSize}
          onReminderFrequencyChange={(value) => {
            const parsed = Number(value);
            setPostureReminderMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
          }}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'setup' })}
          onSkip={() => {
            void persistSetupState(true);
            setCurrentScreen({ screen: 'main-menu' });
          }}
          onStartPractice={() => {
            void persistSetupState(true);
            setCurrentScreen({ screen: 'main-menu' });
          }}
        />
      );
      break;

    case 'main-menu':
      screenContent = (
        <MainMenuScreen
          onOpenLibrary={() => setCurrentScreen({ screen: 'library' })}
          onOpenLearn={() => setCurrentScreen({ screen: 'learn-hub' })}
          onOpenFreePlay={() => setCurrentScreen({ screen: 'free-play' })}
          onOpenSoundboard={() => setCurrentScreen({ screen: 'soundboard' })}
          onOpenTheory={() => setCurrentScreen({ screen: 'theory-hub' })}
          onOpenProgress={() => setCurrentScreen({ screen: 'progress-dashboard' })}
          onOpenSettings={() => setCurrentScreen({ screen: 'settings' })}
          onOpenSetup={() => setCurrentScreen({ screen: 'setup' })}
        />
      );
      break;

    case 'library':
      screenContent = (
        <LibraryScreen
          audioEngine={audioEngineRef.current}
          onStartTheoryPractice={() => setCurrentScreen({ screen: 'theory-hub' })}
          onStartSession={(song, mode) => startSongSession(song, mode)}
          onStartPlaylistQueue={startPlaylistQueue}
        />
      );
      break;

    case 'learn-hub':
      screenContent = (
        <LearnHubScreen
          tiers={CURRICULUM}
          progress={learningProgress}
          onOpenLesson={(lessonId) => navigateToLesson(lessonId)}
          onToggleGating={(enabled) => updateLearningProgressState((current) => setLearningGating(current, enabled))}
          onStartCapstone={(tierId) => void startCapstone(tierId)}
        />
      );
      break;

    case 'lesson': {
      const lesson = getLessonById(currentScreen.lessonId);
      const tier = getTierByLessonId(currentScreen.lessonId);
      screenContent = lesson && tier ? (
        <LessonScreen
          lesson={lesson}
          tier={tier}
          curriculum={CURRICULUM}
          progress={learningProgress}
          initialStepIndex={currentScreen.stepIndex}
          onBack={() => setCurrentScreen({ screen: 'learn-hub' })}
          onOpenLesson={(lessonId) => navigateToLesson(lessonId)}
          onStartDrill={startLessonDrill}
          onStartScale={(lessonId, stepIndex, preset) =>
            setCurrentScreen({ screen: 'scale-practice', preset, returnTo: { lessonId, stepIndex } })
          }
          onStartInterval={(lessonId, stepIndex, preset) =>
            setCurrentScreen({ screen: 'interval-trainer', preset, returnTo: { lessonId, stepIndex } })
          }
          onStartQuiz={(lessonId, stepIndex, preset) =>
            setCurrentScreen({ screen: 'theory-quiz', preset, returnTo: { lessonId, stepIndex } })
          }
          onCompleteStep={handleCompleteLessonStep}
          onCompleteLesson={handleCompleteLesson}
        />
      ) : (
        <main className="app-shell lesson-screen">
          <section className="panel lesson-empty-state">
            <p className="eyebrow">Learn Hub</p>
            <h1>Lesson not found</h1>
            <button className="secondary-button" onClick={() => setCurrentScreen({ screen: 'learn-hub' })}>
              Back to Learn
            </button>
          </section>
        </main>
      );
      break;
    }

    case 'free-play':
      screenContent = (
        <FreePlayScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          keyboardOverlaySize={keyboardOverlaySize}
          postureReminderMinutes={postureReminderMinutes}
          breakReminderMinutes={breakReminderMinutes}
          onBackToMainMenu={() => setCurrentScreen({ screen: 'main-menu' })}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'free-play' })}
        />
      );
      break;

    case 'soundboard':
      screenContent = (
        <NoveltySoundboardScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          keyboardOverlaySize={keyboardOverlaySize}
          onBackToMainMenu={() => setCurrentScreen({ screen: 'main-menu' })}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'soundboard' })}
        />
      );
      break;

    case 'theory-hub':
      screenContent = (
        <TheoryHubScreen
          onStartIntervalTrainer={(preset) => setCurrentScreen({ screen: 'interval-trainer', preset })}
          onStartQuiz={(preset) => setCurrentScreen({ screen: 'theory-quiz', preset })}
          onStartScalePractice={(preset) => setCurrentScreen({ screen: 'scale-practice', preset })}
        />
      );
      break;

    case 'progress-dashboard':
      screenContent = <ProgressDashboardScreen />;
      break;

    case 'settings':
      screenContent = (
        <SettingsScreen
          inputMode={inputMode}
          midiDevices={midiDevices}
          midiError={midiError}
          onSettingChange={applySettingChange}
          onInputModeChange={persistInputMode}
          onRetryMidi={retryMidiInit}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'settings' })}
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
          onAchievementsUnlocked={enqueueAchievementToasts}
          onSessionComplete={(payload) => {
            if (currentScreen.returnTo) {
              handleLearningSessionResult(currentScreen.returnTo.lessonId, currentScreen.returnTo.stepIndex, payload.accuracy);
            }
          }}
          preset={currentScreen.preset}
        />
      );
      break;

    case 'interval-trainer':
      screenContent = (
        <IntervalTrainerScreen
          audioEngine={audioEngineRef.current}
          onAchievementsUnlocked={enqueueAchievementToasts}
          onSessionComplete={(payload) => {
            if (currentScreen.returnTo) {
              handleLearningSessionResult(currentScreen.returnTo.lessonId, currentScreen.returnTo.stepIndex, payload.accuracy);
            }
          }}
          preset={currentScreen.preset}
        />
      );
      break;

    case 'theory-quiz':
      screenContent = (
        <TheoryQuizScreen
          audioEngine={audioEngineRef.current}
          onAchievementsUnlocked={enqueueAchievementToasts}
          onSessionComplete={(payload) => {
            if (currentScreen.returnTo) {
              handleLearningSessionResult(currentScreen.returnTo.lessonId, currentScreen.returnTo.stepIndex, payload.accuracy);
            }
          }}
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
          source={{ kind: 'library-song', song: currentScreen.song, playlistQueue: currentScreen.playlistQueue }}
          initialSessionConfig={currentScreen.sessionConfig}
          colorBlindMode={colorBlindMode}
          noteLabels={noteLabels}
          noteLabelSize={noteLabelSize}
          keyboardOverlaySize={keyboardOverlaySize}
          breakReminderMinutes={breakReminderMinutes}
          onExit={() => setCurrentScreen({ screen: 'main-menu' })}
          onGameFinished={handleGameFinished}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'library' })}
        />
      );
      break;

    case 'lesson-drill':
      screenContent = (
        <GameScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          source={{
            kind: 'lesson-drill',
            lessonId: currentScreen.lessonId,
            stepIndex: currentScreen.stepIndex,
            parsedSong: currentScreen.parsedSong,
          }}
          initialSessionConfig={currentScreen.sessionConfig}
          colorBlindMode={colorBlindMode}
          noteLabels={noteLabels}
          noteLabelSize={noteLabelSize}
          keyboardOverlaySize={keyboardOverlaySize}
          breakReminderMinutes={breakReminderMinutes}
          onExit={() => navigateToLesson(currentScreen.lessonId, currentScreen.stepIndex)}
          exitLabel="Back to Lesson"
          onGameFinished={handleGameFinished}
          onLessonDrillFinished={(payload) => handleLearningSessionResult(payload.lessonId, payload.stepIndex, payload.result.accuracy)}
          onOpenKeyboardSetup={() =>
            setCurrentScreen({
              screen: 'keyboard-setup',
              returnTo: { lessonId: currentScreen.lessonId, stepIndex: currentScreen.stepIndex },
            })
          }
        />
      );
      break;

    case 'capstone': {
      const capstoneTierId = currentScreen.tierId;
      screenContent = (
        <GameScreen
          audioEngine={audioEngineRef.current}
          inputMode={inputMode}
          keyboardInputService={keyboardServiceRef.current}
          midiInputService={midiServiceRef.current}
          source={{
            kind: 'lesson-drill',
            lessonId: `capstone-${capstoneTierId}`,
            stepIndex: 0,
            parsedSong: currentScreen.parsedSong,
          }}
          initialSessionConfig={currentScreen.sessionConfig}
          colorBlindMode={colorBlindMode}
          noteLabels={noteLabels}
          noteLabelSize={noteLabelSize}
          keyboardOverlaySize={keyboardOverlaySize}
          breakReminderMinutes={breakReminderMinutes}
          onExit={() => setCurrentScreen({ screen: 'learn-hub' })}
          exitLabel="Back to Learn Hub"
          onGameFinished={handleGameFinished}
          onLessonDrillFinished={(payload) => {
            updateLearningProgressState((current) =>
              recordCapstoneResult(current, capstoneTierId as LearningTierId, payload.result.accuracy),
            );
            setCurrentScreen({ screen: 'learn-hub' });
          }}
          onOpenKeyboardSetup={() => setCurrentScreen({ screen: 'keyboard-setup', returnTo: 'library' })}
        />
      );
      break;
    }

    case 'results':
      screenContent = (
        <ResultsScreen
          baselineStats={currentScreen.baselineStats}
          result={currentScreen.result}
          sessionConfig={currentScreen.sessionConfig}
          song={currentScreen.song}
          onAchievementsUnlocked={enqueueAchievementToasts}
          onDailyGoalReached={handleDailyGoalReached}
          onSongGoalReached={handleSongGoalReached}
          onMainMenu={() => setCurrentScreen({ screen: 'main-menu' })}
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

  const showAppChrome =
    currentScreen.screen !== 'game' &&
    currentScreen.screen !== 'free-play' &&
    currentScreen.screen !== 'lesson-drill' &&
    currentScreen.screen !== 'capstone';
  const canNavigateBack = currentScreen.screen !== 'setup' && currentScreen.screen !== 'main-menu';

  return (
    <>
      {showAppChrome ? (
        <div className="app-frame">
          <header className="app-topbar">
            <div className="app-topbar-brand">PIANO HERO</div>
            <div className="app-topbar-title">{getScreenTitle(currentScreen)}</div>
            <div className="app-topbar-actions">
              {canNavigateBack ? (
                <button className="secondary-button chrome-back-button" onClick={handleBackNavigation}>
                  Back
                </button>
              ) : (
                <div className="app-topbar-spacer" aria-hidden="true" />
              )}
            </div>
          </header>
          {screenContent}
        </div>
      ) : (
        screenContent
      )}
      {showDailyGoalToast && (
        <aside className="achievement-toast achievement-toast--goal" role="status" aria-live="polite">
          <div className="achievement-toast-icon">🎯</div>
          <div>
            <p className="eyebrow">Daily Goal Reached</p>
            <strong>Practice complete for today!</strong>
            <p className="panel-copy">Keep it up — consistency is the key to progress.</p>
          </div>
          <button className="secondary-button" onClick={() => setShowDailyGoalToast(false)}>
            Dismiss
          </button>
        </aside>
      )}
      {showSongGoalToast && (
        <aside className="achievement-toast achievement-toast--goal achievement-toast--song-goal" role="status" aria-live="polite">
          <div className="achievement-toast-icon">🏆</div>
          <div>
            <p className="eyebrow">Song Goal Reached</p>
            <strong>Personal best — accuracy target cleared!</strong>
          </div>
          <button className="secondary-button" onClick={() => setShowSongGoalToast(false)}>
            Dismiss
          </button>
        </aside>
      )}
      <AchievementToast
        achievementId={achievementToastQueue[0] ?? null}
        onClose={() => setAchievementToastQueue((current) => current.slice(1))}
      />
    </>
  );
}

