import { useEffect, useMemo, useState } from 'react';
import { ComputerKeyboardInputService, isBindableCode } from '../../lib/input/computerKeyboardInputService';
import {
  INPUT_KEYBOARD_MAPPING_SETTING_KEY,
  INPUT_MODE_SETTING_KEY,
  INPUT_SETTINGS_CATEGORY,
  KEYBOARD_ACTIONS,
  assignKeyboardCode,
  createDefaultKeyboardMapping,
  formatKeyboardCode,
  keyboardActionToDisplay,
  keyboardActionToMidi,
  parseKeyboardMapping,
  stringifyKeyboardMapping,
} from '../../lib/input/settings';
import type { InputMode, KeyboardAction, KeyboardMapping, KeyboardNoteAction } from '../../lib/input/types';
import { PianoKeyboard } from './PianoKeyboard';

interface KeyboardSetupScreenProps {
  keyboardInputService: ComputerKeyboardInputService;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
}

function isNoteAction(action: KeyboardAction): action is KeyboardNoteAction {
  return action.startsWith('note-');
}

export function KeyboardSetupScreen({
  keyboardInputService,
  inputMode,
  onInputModeChange,
}: KeyboardSetupScreenProps) {
  const [mapping, setMapping] = useState<KeyboardMapping>(keyboardInputService.getMapping());
  const [octaveShift, setOctaveShift] = useState(keyboardInputService.getState().octaveShift);
  const [captureAction, setCaptureAction] = useState<KeyboardAction | null>(null);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState('Use your keyboard to preview notes and remap controls.');

  useEffect(() => {
    const unsubscribeState = keyboardInputService.subscribeState((state) => {
      setMapping(state.mapping);
      setOctaveShift(state.octaveShift);
    });
    const heldBySource = new Map<number, Set<string>>();
    const unsubscribeInput = keyboardInputService.subscribe((event) => {
      if (event.type === 'noteon' && typeof event.note === 'number') {
        const next = heldBySource.get(event.note) ?? new Set<string>();
        next.add(event.sourceId);
        heldBySource.set(event.note, next);
        setActiveNotes([...heldBySource.keys()].sort((left, right) => left - right));
        return;
      }
      if (event.type === 'noteoff' && typeof event.note === 'number') {
        const existing = heldBySource.get(event.note);
        if (!existing) {
          return;
        }
        existing.delete(event.sourceId);
        if (existing.size === 0) {
          heldBySource.delete(event.note);
        }
        setActiveNotes([...heldBySource.keys()].sort((left, right) => left - right));
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeInput();
    };
  }, [keyboardInputService]);

  useEffect(() => {
    if (!window.appBridge) {
      return;
    }

    const load = async () => {
      const rawMapping = await window.appBridge?.getSetting(INPUT_SETTINGS_CATEGORY, INPUT_KEYBOARD_MAPPING_SETTING_KEY);
      if (!rawMapping) {
        return;
      }
      const parsed = parseKeyboardMapping(rawMapping);
      keyboardInputService.setMapping(parsed);
    };

    void load();
  }, [keyboardInputService]);

  useEffect(() => {
    if (!captureAction) {
      keyboardInputService.setSuspended(false);
      return;
    }

    keyboardInputService.setSuspended(true);
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        setCaptureAction(null);
        setStatusMessage('Binding canceled.');
        return;
      }

      if (!isBindableCode(event.code)) {
        setStatusMessage(`${event.code} is not supported. Try another key.`);
        return;
      }

      const nextMapping = assignKeyboardCode(mapping, captureAction, event.code);
      keyboardInputService.setMapping(nextMapping);
      void window.appBridge?.setSetting(
        INPUT_SETTINGS_CATEGORY,
        INPUT_KEYBOARD_MAPPING_SETTING_KEY,
        stringifyKeyboardMapping(nextMapping),
      );
      setCaptureAction(null);
      setStatusMessage(`${keyboardActionToDisplay(captureAction)} set to ${formatKeyboardCode(event.code)}.`);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      keyboardInputService.setSuspended(false);
    };
  }, [captureAction, keyboardInputService, mapping]);

  const noteRows = useMemo(() => {
    const firstRow = KEYBOARD_ACTIONS.slice(0, 12);
    const secondRow = KEYBOARD_ACTIONS.slice(12, 24);
    return [firstRow, secondRow];
  }, []);

  const handleStartCapture = (action: KeyboardAction) => {
    setCaptureAction(action);
    setStatusMessage(`Press a key to bind ${keyboardActionToDisplay(action)}. Press Escape to cancel.`);
  };

  const handleClear = (action: KeyboardAction) => {
    const next = assignKeyboardCode(mapping, action, null);
    keyboardInputService.setMapping(next);
    void window.appBridge?.setSetting(
      INPUT_SETTINGS_CATEGORY,
      INPUT_KEYBOARD_MAPPING_SETTING_KEY,
      stringifyKeyboardMapping(next),
    );
    setStatusMessage(`${keyboardActionToDisplay(action)} was cleared.`);
  };

  const handleReset = () => {
    const next = createDefaultKeyboardMapping();
    keyboardInputService.setMapping(next);
    void window.appBridge?.setSetting(
      INPUT_SETTINGS_CATEGORY,
      INPUT_KEYBOARD_MAPPING_SETTING_KEY,
      stringifyKeyboardMapping(next),
    );
    setCaptureAction(null);
    setStatusMessage('Keyboard mapping reset to defaults.');
  };

  return (
    <main className="app-shell keyboard-setup-screen" onPointerDownCapture={() => keyboardInputService.setSuspended(false)}>
      <section className="panel keyboard-setup-hero">
        <div>
          <p className="eyebrow">Keyboard Setup</p>
          <h1>Play with your computer keyboard.</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={handleReset}>
            Reset Mapping
          </button>
        </div>
      </section>

      <section className="panel keyboard-mode-panel">
        <label>
          <span>Input Mode</span>
          <select
            value={inputMode}
            onChange={(event) => {
              const nextMode = event.target.value as InputMode;
              onInputModeChange(nextMode);
              void window.appBridge?.setSetting(INPUT_SETTINGS_CATEGORY, INPUT_MODE_SETTING_KEY, nextMode);
            }}
          >
            <option value="both">Both</option>
            <option value="midi">MIDI</option>
            <option value="computer-keyboard">Computer Keyboard</option>
          </select>
        </label>
        <div className="keyboard-mode-meta">
          <span>Octave Shift</span>
          <strong>{octaveShift >= 0 ? `+${octaveShift}` : octaveShift}</strong>
        </div>
      </section>

      <section className="panel keyboard-mapping-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Note Slots</p>
            <h2>Two-octave default layout</h2>
          </div>
        </div>
        <div className="keyboard-mapping-grid">
          {noteRows.map((row, rowIndex) => (
            <div className="keyboard-mapping-row" key={rowIndex}>
              {row.map((action) => (
                <article className="keyboard-bind-card" key={action}>
                  <span>{keyboardActionToDisplay(action)}</span>
                  <strong>{formatKeyboardCode(mapping[action])}</strong>
                  {isNoteAction(action) && (
                    <small>
                      MIDI {keyboardActionToMidi(action, octaveShift) ?? '--'}
                    </small>
                  )}
                  <div className="transport-buttons">
                    <button className="secondary-button" onClick={() => handleStartCapture(action)}>
                      Rebind
                    </button>
                    <button className="secondary-button" onClick={() => handleClear(action)}>
                      Clear
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel keyboard-mapping-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Controls</p>
            <h2>Sustain and Octave</h2>
          </div>
        </div>
        <div className="keyboard-control-grid">
          {(['sustain', 'octave-down', 'octave-up'] as KeyboardAction[]).map((action) => (
            <article className="keyboard-bind-card" key={action}>
              <span>{keyboardActionToDisplay(action)}</span>
              <strong>{formatKeyboardCode(mapping[action])}</strong>
              <div className="transport-buttons">
                <button className="secondary-button" onClick={() => handleStartCapture(action)}>
                  Rebind
                </button>
                <button className="secondary-button" onClick={() => handleClear(action)}>
                  Clear
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PianoKeyboard activeNotes={activeNotes} upcomingNotes={[]} />
    </main>
  );
}
