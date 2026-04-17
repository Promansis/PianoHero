import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_INSTRUMENT_ID, INSTRUMENTS } from '../../lib/audio/instrumentCatalog';
import type { AudioEngine } from '../../lib/audio/audioEngine';
import { isRewardUnlocked, REWARD_CATALOG } from '../../lib/rewards/rewardCatalog';
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
  unlockedRewardIds?: Set<string>;
  pitchBendEnabled: boolean;
  onSettingChange: (category: string, key: string, value: string) => void;
  onInputModeChange: (nextMode: InputMode) => void;
  onRetryMidi: () => void;
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

const DEFAULT_SETTINGS: SettingsValues = {
  'audio.instrumentId': DEFAULT_INSTRUMENT_ID,
  'audio.masterVolume': '80',
  'audio.metronomeVolume': '65',
  'audio.reverbLevel': '20',
  'audio.latencyCompMs': '0',
  'audio.metronomeSound': 'classic',
  'audio.pitchBendEnabled': 'true',
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

export function SettingsScreen({
  audioEngine,
  inputMode,
  midiDevices,
  midiError,
  unlockedRewardIds = new Set(),
  pitchBendEnabled,
  onSettingChange,
  onInputModeChange,
  onRetryMidi,
  onOpenKeyboardSetup,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('audio');
  const [values, setValues] = useState<SettingsValues>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<'data' | 'progress' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading saved settings.');
  const [samplePackPath, setSamplePackPath] = useState<string | null>(null);
  const [showLatencyWizard, setShowLatencyWizard] = useState(false);
  const [samplePackFileCount, setSamplePackFileCount] = useState(0);

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

      setStatusMessage('Settings loaded.');
      setIsLoading(false);
    };

    void load();
  }, [inputMode]);

  const selectedMidiDeviceName = useMemo(
    () => midiDevices.find((device) => device.id === values['input.midiDeviceId'])?.name ?? 'Any connected device',
    [midiDevices, values],
  );

  const persistSetting = async (category: string, key: string, value: string) => {
    setValues((current) => ({ ...current, [getSettingKey(category, key)]: value }));
    onSettingChange(category, key, value);
    setIsSaving(true);
    setStatusMessage('Saving settings...');
    await window.appBridge?.setSetting(category, key, value);
    setIsSaving(false);
    setStatusMessage('Settings saved.');
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
  };

  const clearSamplePack = async () => {
    setSamplePackPath(null);
    setSamplePackFileCount(0);
    await window.appBridge?.setSetting('audio', 'customSamplePackPath', '');
    onSettingChange('audio', 'customSamplePackPath', '');
    setStatusMessage('Custom sample pack cleared. Using built-in instruments.');
  };

  const resetUserData = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsResetting(true);
    setStatusMessage('Resetting user data...');

    try {
      await window.appBridge.resetUserData();
      window.localStorage.clear();
      setValues(DEFAULT_SETTINGS);
      setSamplePackPath(null);
      setSamplePackFileCount(0);
      setResetTarget(null);
      setStatusMessage('User data reset. The app is back to defaults.');
      toastBus.push({
        variant: 'success',
        title: 'User data reset',
        message: 'Songs, history, and saved settings were cleared.',
      });
    } catch {
      setIsResetting(false);
      setStatusMessage('Reset failed. Your data was not fully cleared.');
      toastBus.push({
        variant: 'error',
        title: 'Reset failed',
        message: 'Your data was not fully cleared. Please try again.',
      });
    }
  };

  const resetLearningProgress = async () => {
    if (!window.appBridge) {
      return;
    }

    setIsResettingProgress(true);
    setStatusMessage('Resetting learning progress...');

    try {
      await window.appBridge.resetLearningProgress();
      setStatusMessage('Learning progress reset. Your library and settings were kept.');
      setResetTarget(null);
      toastBus.push({
        variant: 'success',
        title: 'Learning progress reset',
        message: 'Lessons, achievements, and practice history were cleared.',
      });
    } catch {
      setStatusMessage('Progress reset failed. Your history was not fully cleared.');
      toastBus.push({
        variant: 'error',
        title: 'Progress reset failed',
        message: 'Your history was not fully cleared.',
      });
    } finally {
      setIsResettingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingPanel
        eyebrow="Settings"
        title="Loading preferences"
        message="Reading saved audio, gameplay, and practice defaults."
        className="settings-screen"
      />
    );
  }

  return (
    <main className="app-shell settings-screen">
      <section className="panel library-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Practice defaults and accessibility</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
      </section>

      <section className="settings-layout">
        <aside className="panel settings-tabs">
          {(Object.keys(TAB_LABELS) as SettingsTab[]).map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'primary-button' : 'secondary-button'}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </aside>

        <section className="panel settings-panel">
          {activeTab === 'audio' && (
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
                    return (
                      <option key={instrument.id} value={instrument.id} disabled={locked}>
                        {locked ? `\uD83D\uDD12 ${instrument.label}` : instrument.label}
                      </option>
                    );
                  })}
                </select>
              </label>
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
                  <option value="classic">Classic (Square)</option>
                  <option value="wood">Wood (Triangle)</option>
                  <option value="soft">Soft (Sine)</option>
                  <option value="digital">Digital (Sawtooth)</option>
                </select>
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
                <em>
                  {!isRewardUnlocked('audio:pitch-bend', unlockedRewardIds)
                    ? 'Unlock Music Theorist rewards to customize pitch-bend behavior.'
                    : 'Allow expressive wheel or joystick bends during play.'}
                </em>
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
              <div className="latency-comp-row">
                <label>
                  <span>Latency Compensation (ms)</span>
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
                  Calibrate…
                </button>
              </div>
              <article className="settings-note-card">
                <span>Instrument Notes</span>
                <strong>
                  {(() => {
                    const instr = INSTRUMENTS.find((i) => i.id === values['audio.instrumentId']);
                    if (!instr) return 'Choose a built-in voice for practice and playback.';
                    if (instr.requiredRewardId && !isRewardUnlocked(instr.requiredRewardId, unlockedRewardIds)) {
                      const reward = REWARD_CATALOG.find((r) => r.id === instr.requiredRewardId);
                      return reward ? `Locked — ${reward.description}` : 'Locked — earn an achievement to unlock.';
                    }
                    return instr.description;
                  })()}
                </strong>
              </article>
              {!IS_WEB ? (
                <article className="settings-note-card">
                <span>Custom Sample Pack</span>
                {samplePackPath ? (
                  <strong>{samplePackPath} ({samplePackFileCount} file{samplePackFileCount !== 1 ? 's' : ''})</strong>
                ) : (
                  <strong>Not configured — using built-in sounds.</strong>
                )}
                <div className="settings-sample-pack-buttons">
                  <button className="secondary-button" onClick={() => void browseSamplePack()}>
                    Browse…
                  </button>
                  {samplePackPath && (
                    <button className="secondary-button" onClick={() => void clearSamplePack()}>
                      Clear
                    </button>
                  )}
                </div>
                  <em>Expected naming: A0.mp3, C1.mp3, Ds1.mp3, Fs1.mp3, etc. (Salamander-style)</em>
                </article>
              ) : null}
            </div>
          )}

          {activeTab === 'visual' && (
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
                  {isRewardUnlocked('theme:neon', unlockedRewardIds ?? new Set()) && (
                    <option value="neon">Neon</option>
                  )}
                </select>
              </label>
              <label>
                <span>Color Blind Mode</span>
                <select
                  value={values['visual.colorBlindMode']}
                  onChange={(event) => void persistSetting('visual', 'colorBlindMode', event.target.value)}
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
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
                <span>Note Preview (beats ahead)</span>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={values['visual.beatsVisible']}
                  onChange={(event) => void persistSetting('visual', 'beatsVisible', event.target.value)}
                />
                <em>{values['visual.beatsVisible']} beats</em>
              </label>
              <label>
                <span>Left Hand Color</span>
                <input
                  type="color"
                  value={values['visual.leftHandColor'] || '#1f3d7a'}
                  onChange={(event) => void persistSetting('visual', 'leftHandColor', event.target.value)}
                />
                <em>Color of falling notes assigned to the left hand</em>
                {values['visual.leftHandColor'] && (
                  <button
                    className="secondary-button"
                    onClick={() => void persistSetting('visual', 'leftHandColor', '')}
                  >
                    Reset
                  </button>
                )}
              </label>
              <label>
                <span>Right Hand Color</span>
                <input
                  type="color"
                  value={values['visual.rightHandColor'] || '#9a4c33'}
                  onChange={(event) => void persistSetting('visual', 'rightHandColor', event.target.value)}
                />
                <em>Color of falling notes assigned to the right hand</em>
                {values['visual.rightHandColor'] && (
                  <button
                    className="secondary-button"
                    onClick={() => void persistSetting('visual', 'rightHandColor', '')}
                  >
                    Reset
                  </button>
                )}
              </label>
              <label>
                <span>Fingering Numbers</span>
                <select
                  value={values['fingering.displayMode']}
                  onChange={(event) => void persistSetting('fingering', 'displayMode', event.target.value)}
                >
                  <option value="always">Always</option>
                  <option value="learning-only">Learning Only</option>
                  <option value="never">Never</option>
                </select>
                <em>Show finger numbers (1–5) on falling notes during play</em>
              </label>
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div className="settings-grid">
              <label>
                <span>Wait Mode Default</span>
                <select
                  value={values['gameplay.waitModeDefault']}
                  onChange={(event) => void persistSetting('gameplay', 'waitModeDefault', event.target.value)}
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
                <em>When on, notes won't scroll until you play them</em>
              </label>
              <label>
                <span>Metronome Default</span>
                <select
                  value={values['gameplay.metronomeDefault']}
                  onChange={(event) => void persistSetting('gameplay', 'metronomeDefault', event.target.value)}
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
                <em>Start each song session with the metronome enabled</em>
              </label>
              <label>
                <span>Timing Window</span>
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
                <span>Lead-in Beats</span>
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
          )}

          {activeTab === 'input' && (
            <div className="settings-grid">
              <label>
                <span>Input Mode</span>
                <select
                  value={inputMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as InputMode;
                    onInputModeChange(nextMode);
                    void persistSetting('input', 'mode', nextMode);
                  }}
                >
                  <option value="both">MIDI + Keyboard</option>
                  <option value="midi">MIDI Only</option>
                  <option value="computer-keyboard">Keyboard Only</option>
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
                  <span>MIDI Status</span>
                  <strong>Permission denied or unavailable</strong>
                  <button className="secondary-button" onClick={onRetryMidi} style={{ marginTop: '0.5rem' }}>
                    Retry MIDI Access
                  </button>
                </article>
              ) : (
                <article className="settings-note-card">
                  <span>Detected Device</span>
                  <strong>{selectedMidiDeviceName}</strong>
                </article>
              )}
              <button className="secondary-button" onClick={onOpenKeyboardSetup}>
                Open Keyboard Mapping
              </button>
            </div>
          )}

          {activeTab === 'practice' && (
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
                <em>Reminds you to check your hand position and posture</em>
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
              <article className="settings-note-card">
                <span>Save Status</span>
                <strong>{isSaving ? 'Saving...' : 'All changes saved'}</strong>
              </article>
              <article className="settings-note-card settings-danger-card">
                <span>Reset Learning Progress</span>
                <strong>Keeps your library, playlists, folders, and settings, but clears achievements and practice history.</strong>
                <button className="danger-button" disabled={isResettingProgress} onClick={() => setResetTarget('progress')}>
                  Reset Learning Progress
                </button>
              </article>
              <article className="settings-note-card settings-danger-card">
                <span>Reset User Data</span>
                <strong>Clears songs, playlists, folders, results, achievements, and saved settings.</strong>
                <button className="danger-button" disabled={isResetting} onClick={() => setResetTarget('data')}>
                  Reset User Data
                </button>
              </article>
            </div>
          )}
        </section>
      </section>
      {resetTarget && (
        <div className="settings-modal-backdrop" role="presentation">
          <section className="panel settings-modal" role="dialog" aria-modal="true" aria-label="Confirm reset">
            <p className="eyebrow">Confirm Reset</p>
            <h2>{resetTarget === 'progress' ? 'Reset learning progress?' : 'Delete all user data?'}</h2>
            <p className="panel-copy">
              {resetTarget === 'progress'
                ? 'This clears lesson progress, achievements, and practice history. Your library and saved settings stay in place.'
                : 'This removes songs, playlists, folders, results, achievements, and saved settings.'}
            </p>
            <div className="settings-modal-actions">
              <button
                className="danger-button"
                disabled={resetTarget === 'progress' ? isResettingProgress : isResetting}
                onClick={() => {
                  if (resetTarget === 'progress') {
                    void resetLearningProgress();
                  } else {
                    void resetUserData();
                  }
                }}
              >
                {resetTarget === 'progress'
                  ? (isResettingProgress ? 'Resetting...' : 'Yes, Reset Progress')
                  : (isResetting ? 'Resetting...' : 'Yes, Delete Everything')}
              </button>
              <button className="secondary-button" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
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
