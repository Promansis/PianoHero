import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DEFAULT_INSTRUMENT_ID,
  getInstrumentDefinition,
  getInstrumentEffectiveReverbPreset,
  INSTRUMENTS,
  isInstrumentSelectable,
  type InstrumentReverbPreset,
} from '../../lib/audio/instrumentCatalog';
import type { AudioEngine } from '../../lib/audio/audioEngine';
import { isRewardUnlocked, REWARD_CATALOG } from '../../lib/rewards/rewardCatalog';
import type { InstrumentSamplePackStatus } from '../../shared/ipc';
import { LatencyWizard } from './LatencyWizard';
import { LoadingPanel } from './LoadingPanel';
import { toastBus } from './Toast';
import type { InputMode } from '../../lib/input/types';
import type { MidiInputDevice } from '../../lib/midi/types';

const KEY_HEIGHT: Record<'small' | 'medium' | 'large', number> = { small: 28, medium: 45, large: 62 };
// 7 white keys, black keys at positions after C,D,F,G,A (indices 0,1,3,4,5)
const WHITE_KEYS = 7;
const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5];

function KeyboardSizeThumbnail({ size }: { size: 'small' | 'medium' | 'large' }) {
  const h = KEY_HEIGHT[size];
  const kw = 8; // white key width px
  const bw = 5; // black key width px
  const bh = Math.round(h * 0.6);
  const totalW = WHITE_KEYS * kw + 2; // +2 for stroke
  return (
    <svg
      className="keyboard-size-thumbnail"
      viewBox={`0 0 ${totalW} ${h + 2}`}
      width={totalW}
      height={h + 2}
      aria-hidden="true"
    >
      {Array.from({ length: WHITE_KEYS }, (_, i) => (
        <rect key={i} x={i * kw + 0.5} y={0.5} width={kw - 1} height={h} rx="1" fill="var(--color-text)" opacity="0.12" stroke="var(--color-border)" strokeWidth="0.8" />
      ))}
      {BLACK_KEY_POSITIONS.map((pos) => (
        <rect key={pos} x={pos * kw + kw - bw / 2} y={0.5} width={bw} height={bh} rx="1" fill="var(--color-text)" opacity="0.7" />
      ))}
    </svg>
  );
}

interface SettingsScreenProps {
  audioEngine: AudioEngine;
  inputMode: InputMode;
  midiDevices: MidiInputDevice[];
  midiError: boolean;
  instrumentSamplePackStatuses?: Record<string, InstrumentSamplePackStatus>;
  unlockedRewardIds?: Set<string>;
  pitchBendEnabled: boolean;
  onInstallInstrumentSamplePack: (instrumentId: string) => Promise<void>;
  onRemoveInstrumentSamplePack: (instrumentId: string) => Promise<void>;
  onDeveloperUnlockAll: () => Promise<void>;
  onLearningProgressReset: () => void;
  onSettingChange: (category: string, key: string, value: string) => void;
  onInputModeChange: (nextMode: InputMode) => void;
  onRetryMidi: () => void;
  onUserDataReset: () => void;
  onOpenKeyboardSetup: () => void;
}

type SettingsTab = 'audio' | 'visual' | 'gameplay' | 'input' | 'practice';

type SettingsValues = Record<string, string>;

const TAB_LABELS: Record<SettingsTab, string> = {
  audio: 'Audio',
  visual: 'Visual',
  gameplay: 'Gameplay',
  input: 'Input',
  practice: 'Practice',
};

const TAB_META: Record<SettingsTab, { accent: string; kicker: string }> = {
  audio: { accent: 'oklch(83% 0.18 76)', kicker: 'Signal' },
  visual: { accent: 'oklch(73% 0.25 331)', kicker: 'Optics' },
  gameplay: { accent: 'oklch(73% 0.2 29)', kicker: 'Timing' },
  input: { accent: 'oklch(82% 0.17 214)', kicker: 'MIDI' },
  practice: { accent: 'oklch(78% 0.17 168)', kicker: 'Routine' },
};

const SETTINGS_TABS = Object.keys(TAB_LABELS) as SettingsTab[];

type SettingsStyle = CSSProperties & {
  '--settings-active-accent'?: string;
  '--settings-tab-accent'?: string;
  '--entrance-delay'?: string;
};

type SettingsActionIcon =
  | 'calibrate'
  | 'check'
  | 'clear'
  | 'keyboard'
  | 'pack'
  | 'retry'
  | 'trash'
  | 'unlock'
  | 'upload'
  | 'x';

function SettingsActionIcon({ icon }: { icon: SettingsActionIcon }) {
  const common = {
    className: 'settings-button-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  switch (icon) {
    case 'calibrate':
      return (
        <svg {...common}>
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M3 12h4" />
          <path d="M17 12h4" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case 'clear':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 6v12M11 6v12M15 6v12" />
          <path d="M5 14h14" />
        </svg>
      );
    case 'pack':
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 11H6z" />
          <path d="M8 8V5h8v3" />
          <path d="M9 13h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case 'retry':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.5-4.6L4 8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.5 4.6L20 16" />
          <path d="M20 20v-4h-4" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M7 7l1 13h8l1-13" />
        </svg>
      );
    case 'unlock':
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 7.6-1.7" />
          <path d="M12 14v2" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
  }
}

function SettingsTabIcon({ tab }: { tab: SettingsTab }) {
  const common = {
    className: 'settings-tab-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  switch (tab) {
    case 'audio':
      return (
        <svg {...common}>
          <path className="settings-tab-wave" d="M3 13c2.2-5.6 4.4-5.6 6.6 0s4.4 5.6 6.6 0 3.7-5.6 4.8-1.8" />
          <path d="M4 17h16" />
          <path d="M7 6v4" />
          <path d="M12 4v6" />
          <path d="M17 6v4" />
        </svg>
      );
    case 'visual':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <rect className="settings-tab-note" x="7" y="4.5" width="3.5" height="4" rx="1" fill="currentColor" stroke="none" />
          <rect className="settings-tab-note" x="13.5" y="10.5" width="4.5" height="4" rx="1" fill="currentColor" stroke="none" />
          <path d="M8.8 8v10" />
          <path d="M15.8 14v4" />
        </svg>
      );
    case 'gameplay':
      return (
        <svg {...common}>
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M4 12h4" />
          <path d="M16 12h4" />
          <circle className="settings-tab-pulse" cx="12" cy="12" r="5" />
          <rect x="8" y="5" width="2.8" height="5.2" rx="0.8" fill="currentColor" stroke="none" />
          <rect x="13.2" y="14" width="2.8" height="5" rx="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'input':
      return (
        <svg {...common}>
          <path d="M12 4a8 8 0 0 1 8 8v2.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 14.5V12a8 8 0 0 1 8-8Z" />
          <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <path className="settings-tab-wave" d="M8 18c1.8 2.2 6.2 2.2 8 0" />
        </svg>
      );
    case 'practice':
      return (
        <svg {...common}>
          <path d="M7 5v14" />
          <path d="M17 5v14" />
          <path d="M7 7h10" />
          <path d="M7 17h10" />
          <path className="settings-tab-pulse" d="M12 8v5l3 2" />
          <path d="M5 12c0-3.8 3.2-7 7-7" />
          <path d="M19 12c0 3.8-3.2 7-7 7" />
        </svg>
      );
  }
}

function SettingsNeonBackdrop() {
  return (
    <div className="settings-neon-backdrop" aria-hidden="true">
      <span className="settings-light settings-light-a" />
      <span className="settings-light settings-light-b" />
      <span className="settings-light settings-light-c" />
      <span className="settings-facet settings-facet-a" />
      <span className="settings-facet settings-facet-b" />
      <span className="settings-facet settings-facet-c" />
      <span className="settings-facet settings-facet-d" />
      <span className="settings-score-lines">
        {['♪', '♫', '♬', '♩', '♪', '♬', '♫', '♪'].map((note, index) => (
          <span key={`${note}-${index}`} className={`settings-score-note settings-score-note-${index + 1}`}>
            {note}
          </span>
        ))}
      </span>
      <svg className="settings-midi-plug" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="58" r="42" />
        <circle cx="42" cy="48" r="4" />
        <circle cx="60" cy="40" r="4" />
        <circle cx="78" cy="48" r="4" />
        <circle cx="48" cy="72" r="4" />
        <circle cx="72" cy="72" r="4" />
        <path d="M42 100h36" />
      </svg>
    </div>
  );
}

const DEFAULT_SETTINGS: SettingsValues = {
  'audio.instrumentId': DEFAULT_INSTRUMENT_ID,
  'audio.masterVolume': '80',
  'audio.metronomeVolume': '65',
  'audio.reverbLevel': '20',
  'audio.latencyCompMs': '0',
  'audio.metronomeSound': 'classic',
  'audio.pitchBendEnabled': 'true',
  'audio.instrumentReverbPresets': '{}',
  'visual.theme': 'dark',
  'visual.colorBlindMode': 'false',
  'visual.noteLabels': 'alphabetic',
  'visual.noteLabelSize': 'medium',
  'visual.keyboardOverlaySize': 'medium',
  'visual.beatsVisible': '8',
  'visual.leftHandColor': '',
  'visual.rightHandColor': '',
  'fingering.displayMode': 'learning-only',
  'gameplay.waitModeDefault': 'false',
  'gameplay.metronomeDefault': 'false',
  'gameplay.hitWindowMs': '100',
  'gameplay.leadInBeats': '2',
  'practice.postureReminderMinutes': '20',
  'input.midiDeviceId': '',
  'practice.dailyGoalMinutes': '20',
  'practice.breakReminderMinutes': '30',
};

function getSettingKey(category: string, key: string): string {
  return `${category}.${key}`;
}

function parseInstrumentReverbPresets(rawValue: string | null | undefined): Record<string, InstrumentReverbPreset> {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, InstrumentReverbPreset] =>
        entry[1] === 'short' || entry[1] === 'medium' || entry[1] === 'hall',
      ),
    );
  } catch {
    return {};
  }
}

interface ConfirmActionModalProps {
  busy: boolean;
  confirmLabel: string;
  description: string;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmActionModal({
  busy,
  confirmLabel,
  description,
  title,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <div className="settings-modal-backdrop" role="presentation">
      <section className="panel settings-modal" role="dialog" aria-modal="true" aria-label="Confirm action">
        <p className="eyebrow">Confirm Action</p>
        <svg className="settings-warning-icon settings-modal-warning-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="M12 3 22 20H2z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </svg>
        <h2>{title}</h2>
        <p className="panel-copy">{description}</p>
        <div className="settings-modal-actions">
          <button className="danger-button" disabled={busy} onClick={onConfirm}>
            <SettingsActionIcon icon="trash" />
            {busy ? 'Working...' : confirmLabel}
          </button>
          <button className="secondary-button" onClick={onCancel}>
            <SettingsActionIcon icon="x" />
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

interface SettingsGroupCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
}

function SettingsGroupCard({
  eyebrow,
  title,
  description,
  footer,
  children,
  className,
}: SettingsGroupCardProps) {
  return (
    <article className={`settings-group-card${className ? ` ${className}` : ''}`}>
      <div className="settings-group-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {description ? <p className="panel-copy">{description}</p> : null}
      </div>
      <div className="settings-group-body">{children}</div>
      {footer ? <p className="settings-group-footer">{footer}</p> : null}
    </article>
  );
}

export function SettingsScreen({
  audioEngine,
  inputMode,
  midiDevices,
  midiError,
  instrumentSamplePackStatuses = {},
  unlockedRewardIds = new Set(),
  pitchBendEnabled,
  onInstallInstrumentSamplePack,
  onRemoveInstrumentSamplePack,
  onDeveloperUnlockAll,
  onLearningProgressReset,
  onSettingChange,
  onInputModeChange,
  onRetryMidi,
  onUserDataReset,
  onOpenKeyboardSetup,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');
  const [values, setValues] = useState<SettingsValues>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUnlockingDeveloperContent, setIsUnlockingDeveloperContent] = useState(false);
  const [resetTarget, setResetTarget] = useState<'data' | 'progress' | 'developer-unlock' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading saved settings.');
  const [samplePackPath, setSamplePackPath] = useState<string | null>(null);
  const [showLatencyWizard, setShowLatencyWizard] = useState(false);
  const [samplePackFileCount, setSamplePackFileCount] = useState(0);
  const [activePackActionInstrumentId, setActivePackActionInstrumentId] = useState<string | null>(null);
  const [settingsSavePulse, setSettingsSavePulse] = useState(0);
  const savePulseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savePulseTimerRef.current !== null) {
        window.clearTimeout(savePulseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!window.appBridge) {
        setStatusMessage('The app bridge is unavailable.');
        setIsLoading(false);
        return;
      }

      const nextValues: SettingsValues = { ...DEFAULT_SETTINGS };
      const keys = Object.keys(DEFAULT_SETTINGS);
      const resolved = await Promise.all(
        keys.map(async (compositeKey) => {
          const [category, key] = compositeKey.split('.');
          const value = await window.appBridge!.getSetting(category, key);
          return [compositeKey, value] as const;
        }),
      );

      resolved.forEach(([compositeKey, value]) => {
        if (value !== null) {
          nextValues[compositeKey] = value;
        }
      });

      nextValues[getSettingKey('input', 'mode')] = inputMode;
      nextValues[getSettingKey('audio', 'pitchBendEnabled')] = pitchBendEnabled ? 'true' : 'false';
      setValues(nextValues);

      const savedSamplePath = await window.appBridge.getSetting('audio', 'customSamplePackPath');
      if (!IS_WEB && savedSamplePath) {
        setSamplePackPath(savedSamplePath);
        const files = await window.appBridge.listAudioFiles(savedSamplePath);
        setSamplePackFileCount(files.length);
      }

      setStatusMessage('Ready. Changes save automatically.');
      setIsLoading(false);
    };

    void load();
  }, [inputMode]);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      [getSettingKey('audio', 'pitchBendEnabled')]: pitchBendEnabled ? 'true' : 'false',
    }));
  }, [pitchBendEnabled]);

  const selectedMidiDeviceName = useMemo(
    () => midiDevices.find((device) => device.id === values['input.midiDeviceId'])?.name ?? 'Any connected device',
    [midiDevices, values],
  );
  const installedPackInstrumentIds = useMemo(
    () =>
      Object.values(instrumentSamplePackStatuses)
        .filter((status) => status.isInstalled)
        .map((status) => status.instrumentId),
    [instrumentSamplePackStatuses],
  );
  const selectedInstrument = getInstrumentDefinition(values['audio.instrumentId']);
  const selectedInstrumentPackStatus = instrumentSamplePackStatuses[selectedInstrument.id];
  const instrumentReverbPresets = parseInstrumentReverbPresets(values['audio.instrumentReverbPresets']);
  const selectedInstrumentReverbPreset = getInstrumentEffectiveReverbPreset(
    selectedInstrument.id,
    instrumentReverbPresets,
  );
  const reverbCustomizationUnlocked = isRewardUnlocked('audio:reverb-customization', unlockedRewardIds);

  const installSelectedInstrumentPack = async () => {
    setActivePackActionInstrumentId(selectedInstrument.id);
    setStatusMessage(`Installing ${selectedInstrumentPackStatus?.packLabel ?? 'instrument pack'}...`);
    try {
      await onInstallInstrumentSamplePack(selectedInstrument.id);
      setStatusMessage(`${selectedInstrumentPackStatus?.packLabel ?? selectedInstrument.label} ready.`);
    } finally {
      setActivePackActionInstrumentId(null);
    }
  };

  const removeSelectedInstrumentPack = async () => {
    setActivePackActionInstrumentId(selectedInstrument.id);
    setStatusMessage(`Removing ${selectedInstrumentPackStatus?.packLabel ?? 'instrument pack'}...`);
    try {
      await onRemoveInstrumentSamplePack(selectedInstrument.id);
      setStatusMessage(`${selectedInstrument.label} reverted to bundled audio.`);
    } finally {
      setActivePackActionInstrumentId(null);
    }
  };

  const persistSetting = async (category: string, key: string, value: string) => {
    setValues((current) => ({ ...current, [getSettingKey(category, key)]: value }));
    onSettingChange(category, key, value);
    setIsSaving(true);
    setStatusMessage('Saving changes...');
    await window.appBridge?.setSetting(category, key, value);
    setIsSaving(false);
    setStatusMessage('Changes saved.');
    setSettingsSavePulse((current) => current + 1);
    if (savePulseTimerRef.current !== null) {
      window.clearTimeout(savePulseTimerRef.current);
    }
    savePulseTimerRef.current = window.setTimeout(() => {
      setSettingsSavePulse(0);
      savePulseTimerRef.current = null;
    }, 360);
  };

  const browseSamplePack = async () => {
    if (!window.appBridge) {
      return;
    }
    const dir = await window.appBridge.pickSampleDirectory();
    if (!dir) {
      return;
    }
    const files = await window.appBridge.listAudioFiles(dir);
    setSamplePackPath(dir);
    setSamplePackFileCount(files.length);
    await window.appBridge.setSetting('audio', 'customSamplePackPath', dir);
    onSettingChange('audio', 'customSamplePackPath', dir);
    setStatusMessage(`Sample pack set: ${files.length} audio file(s) found.`);
    toastBus.push({
      variant: 'success',
      title: 'Sample pack updated',
      message: `Loaded ${files.length} audio file${files.length === 1 ? '' : 's'} from the selected folder.`,
    });
  };

  const clearSamplePack = async () => {
    setSamplePackPath(null);
    setSamplePackFileCount(0);
    await window.appBridge?.setSetting('audio', 'customSamplePackPath', '');
    onSettingChange('audio', 'customSamplePackPath', '');
    setStatusMessage('Custom sample folder cleared. Built-in instruments are active.');
    toastBus.push({
      variant: 'info',
      title: 'Sample folder cleared',
      message: 'Built-in instrument sounds are active again.',
    });
  };

  const resetUserData = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsResetting(true);
    setStatusMessage('Deleting songs, history, and saved settings...');

    try {
      await window.appBridge.resetUserData();
      window.localStorage.clear();
      setValues(DEFAULT_SETTINGS);
      setSamplePackPath(null);
      setSamplePackFileCount(0);
      setResetTarget(null);
      setStatusMessage('All user data was deleted. LumaKeys is back to defaults.');
      onUserDataReset();
      toastBus.push({
        variant: 'info',
        title: 'User data deleted',
        message: 'Songs, history, and saved settings were removed.',
      });
    } catch {
      setStatusMessage('Delete failed. Some data may still be saved.');
      toastBus.push({
        variant: 'error',
        title: 'Delete failed',
        message: 'Some data may still be saved. Try again before sharing this device.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const resetLearningProgress = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsResettingProgress(true);
    setStatusMessage('Clearing lesson progress and practice history...');

    try {
      await window.appBridge.resetLearningProgress();
      setStatusMessage('Learning progress cleared. Your songs and settings were kept.');
      setResetTarget(null);
      onLearningProgressReset();
      toastBus.push({
        variant: 'success',
        title: 'Learning progress cleared',
        message: 'Lessons, achievements, and practice history were cleared.',
      });
    } catch {
      setStatusMessage('Progress reset failed. Some history may still be saved.');
      toastBus.push({
        variant: 'error',
        title: 'Progress reset failed',
        message: 'Some lesson or practice history may still be saved. Please try again.',
      });
    } finally {
      setIsResettingProgress(false);
    }
  };

  const unlockDeveloperContent = async () => {
    setIsUnlockingDeveloperContent(true);
    setStatusMessage('Unlocking test content...');

    try {
      await onDeveloperUnlockAll();
      setResetTarget(null);
      setStatusMessage('Test content unlocked. Clear learning progress to lock it again.');
      toastBus.push({
        variant: 'success',
        title: 'Test content unlocked',
        message: 'All achievements, rewards, lessons, and capstones are now open for testing.',
      });
    } catch {
      setStatusMessage('Unlock failed. Some test content may still be locked.');
      toastBus.push({
        variant: 'error',
        title: 'Unlock failed',
        message: 'Some test content may still be locked. Please try again.',
      });
    } finally {
      setIsUnlockingDeveloperContent(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingPanel
        eyebrow="Settings"
        title="Loading settings"
        message="Reading your saved sound, display, and practice choices."
        className="settings-screen"
      />
    );
  }

  return (
    <main
      className="app-shell settings-screen"
      data-settings-tab={activeTab}
      style={{ '--settings-active-accent': TAB_META[activeTab].accent } as SettingsStyle}
    >
      <div className="settings-layout-shell">
        <section className="panel settings-panel">
          <SettingsNeonBackdrop />

          <div className="settings-panel-status" aria-live="polite">
            <div>
              <p className="eyebrow">Settings</p>
              <h1>{TAB_LABELS[activeTab]}</h1>
            </div>
            <p
              key={statusMessage}
              className={`settings-status-message${isSaving ? ' settings-status-message-saving' : ''}`}
            >
              {statusMessage}
            </p>
          </div>

          <section className="settings-tab-row" role="tablist" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab, index) => (
              <button
                key={tab}
                id={`settings-tab-${tab}`}
                role="tab"
                aria-label={TAB_LABELS[tab]}
                aria-selected={activeTab === tab}
                aria-controls={`settings-panel-${tab}`}
                className={`settings-tab-button${activeTab === tab ? ' settings-tab-button-active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  '--settings-tab-accent': TAB_META[tab].accent,
                  '--entrance-delay': `${80 + index * 55}ms`,
                } as SettingsStyle}
                type="button"
              >
                <SettingsTabIcon tab={tab} />
                <span className="settings-tab-copy">
                  <span className="settings-tab-kicker">{TAB_META[tab].kicker}</span>
                  <span>{TAB_LABELS[tab]}</span>
                </span>
              </button>
            ))}
          </section>

        {activeTab === 'audio' && (
          <div
            key="settings-tabpanel-audio"
            className="settings-content-grid settings-content-grid-audio"
            role="tabpanel"
            id="settings-panel-audio"
            aria-labelledby="settings-tab-audio"
          >
            <SettingsGroupCard eyebrow="Audio" title="Instrument" description="Choose the default voice for playback and practice.">
              <div className="settings-grid">
                <label>
                  <span>Instrument</span>
                  <select
                    value={values['audio.instrumentId']}
                    onChange={(event) => void persistSetting('audio', 'instrumentId', event.target.value)}
                  >
                    {INSTRUMENTS.map((instrument) => {
                      const locked = instrument.requiredRewardId
                        ? !isRewardUnlocked(instrument.requiredRewardId, unlockedRewardIds)
                        : false;
                      const unavailable = !isInstrumentSelectable(instrument.id, installedPackInstrumentIds);
                      const packStatus = instrumentSamplePackStatuses[instrument.id];
                      const disabled = locked || unavailable;
                      return (
                        <option key={instrument.id} value={instrument.id} disabled={disabled}>
                          {locked
                            ? `\uD83D\uDD12 ${instrument.label}`
                            : unavailable
                              ? `${instrument.label} (${packStatus?.requiresPackForSelection ? 'Install sounds first' : 'Unavailable'})`
                              : instrument.label}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <article className="settings-note-card">
                  <span>Instrument Notes</span>
                  <strong>
                    {(() => {
                      const instr = INSTRUMENTS.find((i) => i.id === values['audio.instrumentId']);
                      if (!instr) return 'Choose a built-in voice for practice and playback.';
                      if (!isInstrumentSelectable(instr.id, installedPackInstrumentIds)) {
                        return instrumentSamplePackStatuses[instr.id]?.statusMessage ?? instr.availabilityNote ?? instr.description;
                      }
                      if (instr.requiredRewardId && !isRewardUnlocked(instr.requiredRewardId, unlockedRewardIds)) {
                        const reward = REWARD_CATALOG.find((r) => r.id === instr.requiredRewardId);
                        return reward ? `Locked: ${reward.description}` : 'Locked: earn an achievement to unlock this sound.';
                      }
                      return instr.description;
                    })()}
                  </strong>
                </article>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard
              title="Volume & Effects"
              footer={
                !isRewardUnlocked('audio:pitch-bend', unlockedRewardIds)
                  ? 'Unlock Music Theorist rewards to turn pitch bend on or off.'
                  : !reverbCustomizationUnlocked
                    ? 'Unlock Music Theorist rewards to change reverb for each instrument.'
                    : `${selectedInstrument.label} uses ${selectedInstrument.reverbPreset ?? 'medium'} reverb unless you change it here.`
              }
            >
              <div className="settings-grid">
                <label>
                  <span>Master Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values['audio.masterVolume']}
                    onChange={(event) => void persistSetting('audio', 'masterVolume', event.target.value)}
                  />
                </label>
                <label>
                  <span>Reverb Level</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values['audio.reverbLevel']}
                    onChange={(event) => void persistSetting('audio', 'reverbLevel', event.target.value)}
                  />
                </label>
                <label>
                  <span>Pitch Bend</span>
                  <select
                    value={values['audio.pitchBendEnabled'] ?? 'true'}
                    onChange={(event) => void persistSetting('audio', 'pitchBendEnabled', event.target.value)}
                    disabled={!isRewardUnlocked('audio:pitch-bend', unlockedRewardIds)}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
                <label>
                  <span>{selectedInstrument.label} Reverb</span>
                  <select
                    aria-label={`${selectedInstrument.label} Reverb`}
                    value={selectedInstrumentReverbPreset}
                    onChange={(event) => {
                      const nextPreset = event.target.value as InstrumentReverbPreset;
                      const nextMap = { ...instrumentReverbPresets };
                      if (nextPreset === (selectedInstrument.reverbPreset ?? 'medium')) {
                        delete nextMap[selectedInstrument.id];
                      } else {
                        nextMap[selectedInstrument.id] = nextPreset;
                      }
                      void persistSetting('audio', 'instrumentReverbPresets', JSON.stringify(nextMap));
                    }}
                    disabled={!reverbCustomizationUnlocked}
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="hall">Hall</option>
                  </select>
                </label>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Metronome" footer="Set how loud the click is and which sound it uses during songs and drills.">
              <div className="settings-grid">
                <label>
                  <span>Metronome Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values['audio.metronomeVolume']}
                    onChange={(event) => void persistSetting('audio', 'metronomeVolume', event.target.value)}
                  />
                </label>
                <label>
                  <span>Metronome Sound</span>
                  <select
                    value={values['audio.metronomeSound']}
                    onChange={(event) => void persistSetting('audio', 'metronomeSound', event.target.value)}
                  >
                    <option value="classic">Classic Click</option>
                    <option value="wood">Wood Block</option>
                    <option value="soft">Soft Tap</option>
                    <option value="digital">Bright Digital</option>
                  </select>
                </label>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Input Delay" footer="Use calibration if notes sound early or late when you play.">
              <div className="settings-grid settings-grid-single">
                <div className="latency-comp-row">
                  <label>
                    <span>Input Delay Fix (ms)</span>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={values['audio.latencyCompMs']}
                      onChange={(event) => void persistSetting('audio', 'latencyCompMs', event.target.value)}
                    />
                  </label>
                  <button
                    className="secondary-button latency-calibrate-btn"
                    onClick={() => setShowLatencyWizard(true)}
                  >
                    <SettingsActionIcon icon="calibrate" />
                    Calibrate…
                  </button>
                </div>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Instrument Sounds" footer="Install higher quality sounds or choose a desktop sample folder.">
              <div className="settings-grid">
                {selectedInstrumentPackStatus ? (
                  <article className="settings-note-card">
                    <span>Selected Instrument</span>
                    <strong>
                      {selectedInstrumentPackStatus.isInstalled
                        ? `${selectedInstrumentPackStatus.packLabel} installed`
                          : selectedInstrumentPackStatus.requiresPackForSelection
                          ? 'Install sounds to use this instrument'
                          : 'Built-in samples active'}
                    </strong>
                    <div className="settings-sample-pack-buttons">
                      {selectedInstrumentPackStatus.canInstallInApp ? (
                        <button
                          className="secondary-button"
                          disabled={activePackActionInstrumentId === selectedInstrument.id}
                          onClick={() => void installSelectedInstrumentPack()}
                        >
                          <SettingsActionIcon icon={selectedInstrumentPackStatus.installMode === 'manual' ? 'upload' : 'pack'} />
                          {activePackActionInstrumentId === selectedInstrument.id
                            ? 'Working...'
                            : selectedInstrumentPackStatus.installMode === 'manual'
                              ? 'Choose Sound Folder'
                              : 'Install Better Sounds'}
                        </button>
                      ) : null}
                      {selectedInstrumentPackStatus.isInstalled ? (
                        <button
                          className="secondary-button"
                          disabled={activePackActionInstrumentId === selectedInstrument.id}
                          onClick={() => void removeSelectedInstrumentPack()}
                        >
                          <SettingsActionIcon icon="clear" />
                          Use Built-in Sounds
                        </button>
                      ) : null}
                    </div>
                    <em>{selectedInstrumentPackStatus.statusMessage}</em>
                  </article>
                ) : (
                  <article className="settings-note-card">
                    <span>Instrument Sounds</span>
                    <strong>No extra sound controls are available for this instrument.</strong>
                  </article>
                )}
                {!IS_WEB ? (
                  <article className="settings-note-card">
                    <span>Custom Sound Folder</span>
                    {samplePackPath ? (
                      <strong>{samplePackPath} ({samplePackFileCount} file{samplePackFileCount !== 1 ? 's' : ''})</strong>
                    ) : (
                      <strong>No folder selected.</strong>
                    )}
                    <div className="settings-sample-pack-buttons">
                      <button className="secondary-button" onClick={() => void browseSamplePack()}>
                        <SettingsActionIcon icon="upload" />
                        Choose Folder
                      </button>
                      {samplePackPath ? (
                        <button className="secondary-button" onClick={() => void clearSamplePack()}>
                          <SettingsActionIcon icon="clear" />
                          Use Built-in Sounds
                        </button>
                      ) : null}
                    </div>
                    <em>Files should be named by note, for example A0.mp3, C1.mp3, Ds1.mp3, or Fs1.mp3.</em>
                  </article>
                ) : (
                  <article className="settings-note-card">
                    <span>Custom Sound Folder</span>
                    <strong>Custom sound folders are available in the desktop app.</strong>
                  </article>
                )}
              </div>
            </SettingsGroupCard>
          </div>
        )}

        {activeTab === 'visual' && (
          <div
            key="settings-tabpanel-visual"
            className="settings-content-grid settings-content-grid-visual"
            role="tabpanel"
            id="settings-panel-visual"
            aria-labelledby="settings-tab-visual"
          >
            <SettingsGroupCard
              eyebrow="Visual"
              title="Appearance"
              footer={
                isRewardUnlocked('theme:neon', unlockedRewardIds)
                  ? 'Neon theme is ready to use.'
                  : 'Unlock the Neon theme reward to use the arcade palette.'
              }
            >
              <div className="settings-grid">
                <label>
                  <span>Theme</span>
                  <select
                    value={values['visual.theme']}
                    onChange={(event) => void persistSetting('visual', 'theme', event.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="warm">Warm</option>
                    <option value="neon" disabled={!isRewardUnlocked('theme:neon', unlockedRewardIds)}>
                      {isRewardUnlocked('theme:neon', unlockedRewardIds) ? 'Neon' : 'Neon (Locked)'}
                    </option>
                  </select>
                </label>
                <label>
                  <span>High Contrast Note Colors</span>
                  <select
                    value={values['visual.colorBlindMode']}
                    onChange={(event) => void persistSetting('visual', 'colorBlindMode', event.target.value)}
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                </label>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Labels & Keyboard" footer={`Falling notes appear ${values['visual.beatsVisible']} beats before you play them.`}>
              <div className="settings-grid">
                <label>
                  <span>Note Labels</span>
                  <select
                    value={values['visual.noteLabels']}
                    onChange={(event) => void persistSetting('visual', 'noteLabels', event.target.value)}
                  >
                    <option value="alphabetic">Alphabetic</option>
                    <option value="symbols">Symbols</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label>
                  <span>Note Label Size</span>
                  <select
                    value={values['visual.noteLabelSize'] ?? 'medium'}
                    onChange={(event) => void persistSetting('visual', 'noteLabelSize', event.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <label>
                  <span>Keyboard Overlay Size</span>
                  <div className="keyboard-size-preview-row">
                    <select
                      value={values['visual.keyboardOverlaySize']}
                      onChange={(event) => void persistSetting('visual', 'keyboardOverlaySize', event.target.value)}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                    <KeyboardSizeThumbnail size={(values['visual.keyboardOverlaySize'] as 'small' | 'medium' | 'large') ?? 'medium'} />
                  </div>
                </label>
                <label>
                  <span>Falling Note Preview</span>
                  <input
                    type="range"
                    min={4}
                    max={16}
                    step={1}
                    value={values['visual.beatsVisible']}
                    onChange={(event) => void persistSetting('visual', 'beatsVisible', event.target.value)}
                  />
                </label>
                <label>
                  <span>Finger Numbers</span>
                  <select
                    value={values['fingering.displayMode']}
                    onChange={(event) => void persistSetting('fingering', 'displayMode', event.target.value)}
                  >
                    <option value="always">Always</option>
                    <option value="learning-only">Learning Only</option>
                    <option value="never">Never</option>
                  </select>
                </label>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Hand Colors" footer="Clear a hand color to use the current theme color.">
              <div className="settings-grid">
                <label>
                  <span>Left Hand Color</span>
                  <input
                    type="color"
                    value={values['visual.leftHandColor'] || '#1f3d7a'}
                    onChange={(event) => void persistSetting('visual', 'leftHandColor', event.target.value)}
                  />
                  {values['visual.leftHandColor'] ? (
                    <button
                      className="secondary-button"
                      onClick={() => void persistSetting('visual', 'leftHandColor', '')}
                    >
                      <SettingsActionIcon icon="clear" />
                      Clear Color
                    </button>
                  ) : null}
                </label>
                <label>
                  <span>Right Hand Color</span>
                  <input
                    type="color"
                    value={values['visual.rightHandColor'] || '#9a4c33'}
                    onChange={(event) => void persistSetting('visual', 'rightHandColor', event.target.value)}
                  />
                  {values['visual.rightHandColor'] ? (
                    <button
                      className="secondary-button"
                      onClick={() => void persistSetting('visual', 'rightHandColor', '')}
                    >
                      <SettingsActionIcon icon="clear" />
                      Clear Color
                    </button>
                  ) : null}
                </label>
              </div>
            </SettingsGroupCard>
          </div>
        )}

        {activeTab === 'gameplay' && (
          <div
            key="settings-tabpanel-gameplay"
            className="settings-content-grid settings-content-grid-gameplay"
            role="tabpanel"
            id="settings-panel-gameplay"
            aria-labelledby="settings-tab-gameplay"
          >
            <SettingsGroupCard eyebrow="Gameplay" title="New Session Defaults" footer="These choices apply each time you start a new song.">
              <div className="settings-grid">
                <label>
                  <span>Start With Wait Mode</span>
                  <select
                    value={values['gameplay.waitModeDefault']}
                    onChange={(event) => void persistSetting('gameplay', 'waitModeDefault', event.target.value)}
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                </label>
                <label>
                  <span>Start With Metronome</span>
                  <select
                    value={values['gameplay.metronomeDefault']}
                    onChange={(event) => void persistSetting('gameplay', 'metronomeDefault', event.target.value)}
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                </label>
                <label>
                  <span>Timing Leniency</span>
                  <select
                    value={values['gameplay.hitWindowMs']}
                    onChange={(event) => void persistSetting('gameplay', 'hitWindowMs', event.target.value)}
                  >
                    <option value="50">Strict (50 ms)</option>
                    <option value="100">Standard (100 ms)</option>
                    <option value="150">Relaxed (150 ms)</option>
                    <option value="200">Forgiving (200 ms)</option>
                  </select>
                </label>
                <label>
                  <span>Count-in Before Start</span>
                  <select
                    value={values['gameplay.leadInBeats'] ?? '2'}
                    onChange={(event) => void persistSetting('gameplay', 'leadInBeats', event.target.value)}
                  >
                    <option value="0">None</option>
                    <option value="1">1 beat</option>
                    <option value="2">2 beats</option>
                    <option value="4">4 beats</option>
                  </select>
                </label>
              </div>
            </SettingsGroupCard>
          </div>
        )}

        {activeTab === 'input' && (
          <div
            key="settings-tabpanel-input"
            className="settings-content-grid settings-content-grid-input"
            role="tabpanel"
            id="settings-panel-input"
            aria-labelledby="settings-tab-input"
          >
            <SettingsGroupCard eyebrow="Input" title="Keyboard Input" footer={`Currently listening for: ${inputMode === 'both' ? 'MIDI keyboard and computer keyboard' : inputMode === 'midi' ? 'MIDI keyboard only' : 'computer keyboard only'}.`}>
              <div className="settings-grid">
                <label>
                  <span>Play Notes With</span>
                  <select
                    value={inputMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as InputMode;
                      onInputModeChange(nextMode);
                      void persistSetting('input', 'mode', nextMode);
                    }}
                  >
                    <option value="both">MIDI or Computer Keyboard</option>
                    <option value="midi">MIDI Keyboard Only</option>
                    <option value="computer-keyboard">Computer Keyboard Only</option>
                  </select>
                </label>
                <label>
                  <span>MIDI Device</span>
                  <select
                    value={values['input.midiDeviceId']}
                    onChange={(event) => void persistSetting('input', 'midiDeviceId', event.target.value)}
                  >
                    <option value="">Any connected device</option>
                    {midiDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                </label>
                {midiError ? (
                  <article className="settings-note-card">
                    <span>MIDI Connection</span>
                    <strong>LumaKeys cannot access your MIDI keyboard. Check browser or system permission, then try again.</strong>
                    <button className="secondary-button" onClick={onRetryMidi} style={{ marginTop: '0.5rem' }}>
                      <SettingsActionIcon icon="retry" />
                      Try MIDI Again
                    </button>
                  </article>
                ) : (
                  <article className="settings-note-card">
                    <span>Connected Keyboard</span>
                    <strong>{selectedMidiDeviceName}</strong>
                  </article>
                )}
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Computer Keyboard Layout" footer="Change which computer keys play each piano note.">
              <div className="settings-grid settings-grid-single">
                <button className="secondary-button" onClick={onOpenKeyboardSetup}>
                  <SettingsActionIcon icon="keyboard" />
                  Edit Key Layout
                </button>
              </div>
            </SettingsGroupCard>
          </div>
        )}

        {activeTab === 'practice' && (
          <div
            key="settings-tabpanel-practice"
            className="settings-content-grid settings-content-grid-practice"
            role="tabpanel"
            id="settings-panel-practice"
            aria-labelledby="settings-tab-practice"
          >
            <SettingsGroupCard eyebrow="Practice" title="Goals & Reminders" footer="Set the daily goal to 0 to turn goal tracking off.">
              <div className="settings-grid">
                <label>
                  <span>Daily Goal (minutes)</span>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={values['practice.dailyGoalMinutes']}
                    onChange={(event) => void persistSetting('practice', 'dailyGoalMinutes', event.target.value)}
                  />
                </label>
                <label>
                  <span>Posture Reminder (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={values['practice.postureReminderMinutes']}
                    onChange={(event) => void persistSetting('practice', 'postureReminderMinutes', event.target.value)}
                  />
                </label>
                <label>
                  <span>Break Reminder (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={values['practice.breakReminderMinutes']}
                    onChange={(event) => void persistSetting('practice', 'breakReminderMinutes', event.target.value)}
                  />
                </label>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard title="Save State">
              <div className="settings-grid settings-grid-single">
                <article
                  key={settingsSavePulse}
                  className={`settings-note-card settings-save-status-card${isSaving ? ' settings-save-status-card-saving' : ''}${settingsSavePulse > 0 ? ' settings-save-status-card-saved' : ''}`}
                >
                  <span>Changes</span>
                  <strong>{isSaving ? 'Saving...' : 'All changes saved'}</strong>
                </article>
              </div>
            </SettingsGroupCard>

            <SettingsGroupCard
              title="Reset Options"
              description="These actions remove progress or data. Each one asks for confirmation before it runs."
              className="settings-danger-zone"
            >
              <div className="settings-danger-actions">
                <article className="settings-note-card settings-danger-card">
                  <svg className="settings-warning-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path d="M12 3 22 20H2z" />
                    <path d="M12 9v5" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>Clear Learning Progress</span>
                  <strong>Removes lesson progress, achievements, and practice history. Keeps songs, playlists, folders, and settings.</strong>
                  <button className="danger-button" disabled={isResettingProgress} onClick={() => setResetTarget('progress')}>
                    <SettingsActionIcon icon="trash" />
                    Clear Learning Progress
                  </button>
                </article>
                <article className="settings-note-card settings-danger-card">
                  <svg className="settings-warning-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path d="M12 3 22 20H2z" />
                    <path d="M12 9v5" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>Delete User Data</span>
                  <strong>Removes songs, playlists, folders, results, achievements, and saved settings from this device.</strong>
                  <button className="danger-button" disabled={isResetting} onClick={() => setResetTarget('data')}>
                    <SettingsActionIcon icon="trash" />
                    Delete User Data
                  </button>
                </article>
                <article className="settings-note-card settings-danger-card">
                  <svg className="settings-warning-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path d="M12 3 22 20H2z" />
                    <path d="M12 9v5" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>Test Content</span>
                  <strong>Opens all achievements, rewards, lessons, and capstones for testing. Clear learning progress to lock them again.</strong>
                  <button
                    className="secondary-button"
                    disabled={isUnlockingDeveloperContent}
                    onClick={() => setResetTarget('developer-unlock')}
                  >
                    <SettingsActionIcon icon="unlock" />
                    Unlock Test Content
                  </button>
                </article>
              </div>
            </SettingsGroupCard>
          </div>
        )}
        </section>
      </div>
      {resetTarget === 'progress' && (
        <ConfirmActionModal
          busy={isResettingProgress}
          confirmLabel="Clear Learning Progress"
          description="This removes lesson progress, achievements, and practice history. Your songs, playlists, folders, and settings stay in place."
          title="Clear learning progress?"
          onCancel={() => setResetTarget(null)}
          onConfirm={() => {
            void resetLearningProgress();
          }}
        />
      )}
      {resetTarget === 'data' && (
        <ConfirmActionModal
          busy={isResetting}
          confirmLabel="Delete User Data"
          description="This removes songs, playlists, folders, results, achievements, and saved settings from this device."
          title="Delete all user data?"
          onCancel={() => setResetTarget(null)}
          onConfirm={() => {
            void resetUserData();
          }}
        />
      )}
      {resetTarget === 'developer-unlock' && (
        <ConfirmActionModal
          busy={isUnlockingDeveloperContent}
          confirmLabel="Unlock Test Content"
          description="This opens every achievement reward and marks all lessons, steps, and capstones complete for testing. Clear learning progress to lock them again."
          title="Unlock test content?"
          onCancel={() => setResetTarget(null)}
          onConfirm={() => {
            void unlockDeveloperContent();
          }}
        />
      )}
      {showLatencyWizard && (
        <LatencyWizard
          audioEngine={audioEngine}
          currentMs={Number(values['audio.latencyCompMs']) || 0}
          onApply={(ms) => void persistSetting('audio', 'latencyCompMs', String(ms))}
          onClose={() => setShowLatencyWizard(false)}
        />
      )}
    </main>
  );
}
