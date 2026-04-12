import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_INSTRUMENT_ID, INSTRUMENTS } from '../../lib/audio/instrumentCatalog';
import type { InputMode } from '../../lib/input/types';
import type { MidiInputDevice } from '../../lib/midi/types';

interface SettingsScreenProps {
  inputMode: InputMode;
  midiDevices: MidiInputDevice[];
  midiError: boolean;
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
  'visual.theme': 'dark',
  'visual.colorBlindMode': 'false',
  'visual.noteLabels': 'alphabetic',
  'visual.keyboardOverlaySize': 'medium',
  'visual.beatsVisible': '8',
  'visual.leftHandColor': '',
  'visual.rightHandColor': '',
  'fingering.displayMode': 'learning-only',
  'gameplay.waitModeDefault': 'false',
  'gameplay.hitWindowMs': '100',
  'practice.postureReminderMinutes': '20',
  'input.midiDeviceId': '',
  'practice.dailyGoalMinutes': '20',
  'practice.breakReminderMinutes': '30',
};

function getSettingKey(category: string, key: string): string {
  return `${category}.${key}`;
}

export function SettingsScreen({
  inputMode,
  midiDevices,
  midiError,
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
  const [statusMessage, setStatusMessage] = useState('Loading saved settings.');
  const [samplePackPath, setSamplePackPath] = useState<string | null>(null);
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

    const confirmed = window.confirm(
      'Reset all user data? This clears songs, results, playlists, folders, settings, achievements, and imported MIDI copies.',
    );
    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setStatusMessage('Resetting user data...');

    try {
      await window.appBridge.resetUserData();
      window.localStorage.clear();
      window.location.reload();
    } catch {
      setIsResetting(false);
      setStatusMessage('Reset failed. Your data was not fully cleared.');
    }
  };

  const resetLearningProgress = async () => {
    if (!window.appBridge) {
      return;
    }

    const confirmed = window.confirm(
      'Reset learning progress? This keeps your songs, folders, playlists, and settings, but clears play history, achievements, trouble spots, theory sessions, and practice time.',
    );
    if (!confirmed) {
      return;
    }

    setIsResettingProgress(true);
    setStatusMessage('Resetting learning progress...');

    try {
      await window.appBridge.resetLearningProgress();
      setStatusMessage('Learning progress reset. Your library and settings were kept.');
      window.location.reload();
    } catch {
      setStatusMessage('Progress reset failed. Your history was not fully cleared.');
    } finally {
      setIsResettingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <main className="app-shell settings-screen">
        <section className="panel library-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Loading preferences</h1>
            <p className="song-title">Reading saved audio, gameplay, and practice defaults.</p>
          </div>
        </section>
        <section className="panel empty-state-panel">
          <div className="loading-spinner" />
        </section>
      </main>
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
                  {INSTRUMENTS.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>
                      {instrument.label}
                    </option>
                  ))}
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
                <span>Latency Compensation (ms)</span>
                <input
                  type="number"
                  value={values['audio.latencyCompMs']}
                  onChange={(event) => void persistSetting('audio', 'latencyCompMs', event.target.value)}
                />
              </label>
              <article className="settings-note-card">
                <span>Instrument Notes</span>
                <strong>
                  {INSTRUMENTS.find((instrument) => instrument.id === values['audio.instrumentId'])?.description ??
                    'Choose a built-in voice for practice and playback.'}
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
                <span>Keyboard Overlay Size</span>
                <select
                  value={values['visual.keyboardOverlaySize']}
                  onChange={(event) => void persistSetting('visual', 'keyboardOverlaySize', event.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
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
                {values['visual.rightHandColor'] && (
                  <button
                    className="secondary-button"
                    onClick={() => void persistSetting('visual', 'rightHandColor', '')}
                  >
                    Reset
                  </button>
                )}
              </label>
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div className="settings-grid">
              <label>
                <span>Fingering Display</span>
                <select
                  value={values['fingering.displayMode']}
                  onChange={(event) => void persistSetting('fingering', 'displayMode', event.target.value)}
                >
                  <option value="always">Always</option>
                  <option value="learning-only">Learning Only</option>
                  <option value="never">Never</option>
                </select>
              </label>
              <label>
                <span>Posture Reminder (minutes)</span>
                <input
                  type="number"
                  value={values['practice.postureReminderMinutes']}
                  onChange={(event) => void persistSetting('practice', 'postureReminderMinutes', event.target.value)}
                />
              </label>
              <label>
                <span>Wait Mode Default</span>
                <select
                  value={values['gameplay.waitModeDefault']}
                  onChange={(event) => void persistSetting('gameplay', 'waitModeDefault', event.target.value)}
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
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
                  value={values['practice.dailyGoalMinutes']}
                  onChange={(event) => void persistSetting('practice', 'dailyGoalMinutes', event.target.value)}
                />
              </label>
              <label>
                <span>Break Reminder (minutes)</span>
                <input
                  type="number"
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
                <button className="danger-button" disabled={isResettingProgress} onClick={() => void resetLearningProgress()}>
                  {isResettingProgress ? 'Resetting...' : 'Reset Learning Progress'}
                </button>
              </article>
              <article className="settings-note-card settings-danger-card">
                <span>Reset User Data</span>
                <strong>Clears songs, playlists, folders, results, achievements, and saved settings.</strong>
                <button className="danger-button" disabled={isResetting} onClick={() => void resetUserData()}>
                  {isResetting ? 'Resetting...' : 'Reset User Data'}
                </button>
              </article>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
