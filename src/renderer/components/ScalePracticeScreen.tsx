import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import { HeldNoteTracker } from '../../lib/input/heldNotes';
import type { InputEvent, InputMode } from '../../lib/input/types';
import { MidiInputService } from '../../lib/midi/midiInputService';
import { PITCH_CLASS_NAMES } from '../../lib/theory/chords';
import { buildScale, getScaleFingering, SCALE_DEFINITIONS, type ScaleDirection, validateScaleSequence } from '../../lib/theory/scales';
import { PianoKeyboard } from './PianoKeyboard';

interface ScalePracticeScreenProps {
  audioEngine: AudioEngine;
  midiInputService: MidiInputService;
  keyboardInputService: ComputerKeyboardInputService;
  inputMode: InputMode;
  onAchievementsUnlocked?: (achievementIds: string[]) => void;
  onSessionComplete?: (payload: { accuracy: number; score: number; totalQuestions: number }) => void;
  onBack?: () => void;
  preset?: { root: number; scaleName: string };
}

export function ScalePracticeScreen({
  audioEngine,
  midiInputService,
  keyboardInputService,
  inputMode,
  onAchievementsUnlocked,
  onSessionComplete,
  onBack,
  preset,
}: ScalePracticeScreenProps) {
  const defaultScale = preset?.scaleName
    ? SCALE_DEFINITIONS.find((scale) => scale.name === preset.scaleName) ?? SCALE_DEFINITIONS[0]
    : SCALE_DEFINITIONS[0];
  const [selectedScaleName, setSelectedScaleName] = useState(defaultScale.name);
  const [selectedRoot, setSelectedRoot] = useState(preset?.root ?? 0);
  const [octaves, setOctaves] = useState(1);
  const [direction, setDirection] = useState<ScaleDirection>('ascending');
  const [tempo, setTempo] = useState(90);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [playedNotes, setPlayedNotes] = useState<number[]>([]);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState('Choose a scale, start the drill, then play the notes in order.');
  const [lastResult, setLastResult] = useState<{ correct: boolean; expected: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [listenIndex, setListenIndex] = useState<number | null>(null);
  const savedSessionRef = useRef(false);
  const listenTimeoutsRef = useRef<number[]>([]);

  const selectedScale = useMemo(
    () => SCALE_DEFINITIONS.find((definition) => definition.name === selectedScaleName) ?? SCALE_DEFINITIONS[0],
    [selectedScaleName],
  );
  const currentScale = useMemo(
    () => buildScale(selectedRoot, selectedScale, octaves, 4),
    [octaves, selectedRoot, selectedScale],
  );

  const sequence = useMemo(() => {
    const validationSeed = direction === 'ascending'
      ? currentScale.midiNotes
      : direction === 'descending'
        ? [...currentScale.midiNotes].reverse()
        : [...currentScale.midiNotes, ...currentScale.midiNotes.slice(0, -1).reverse()];
    return validationSeed;
  }, [currentScale, direction]);

  const fingering = useMemo(
    () => getScaleFingering(selectedRoot, selectedScale.name, octaves, direction),
    [selectedRoot, selectedScale.name, octaves, direction],
  );

  // Pairs each note in the sequence with its name and fingers.
  const sequenceNotes = useMemo(
    () => sequence.map((midi, i) => ({
      midi,
      name: PITCH_CLASS_NAMES[midi % 12],
      rh: fingering.rh[i] ?? 0,
      lh: fingering.lh[i] ?? 0,
    })),
    [sequence, fingering],
  );

  const stopListen = useCallback(() => {
    for (const id of listenTimeoutsRef.current) window.clearTimeout(id);
    listenTimeoutsRef.current = [];
    setIsListening(false);
    setListenIndex(null);
    audioEngine.allNotesOff();
  }, [audioEngine]);

  const handleListen = useCallback(async () => {
    if (isListening) { stopListen(); return; }
    await audioEngine.init();
    setIsActive(false);
    setIsListening(true);
    const stepMs = (60 / Math.max(40, tempo)) * 1000;
    const holdMs = stepMs * 0.8;
    const ids: number[] = [];
    sequence.forEach((midi, i) => {
      ids.push(window.setTimeout(() => {
        setListenIndex(i);
        void audioEngine.noteOn(midi, 0.8);
      }, i * stepMs));
      ids.push(window.setTimeout(() => audioEngine.noteOff(midi), i * stepMs + holdMs));
    });
    ids.push(window.setTimeout(() => { setIsListening(false); setListenIndex(null); }, sequence.length * stepMs));
    listenTimeoutsRef.current = ids;
  }, [audioEngine, isListening, sequence, stopListen, tempo]);

  // Stop listen when sequence/tempo change.
  useEffect(() => { stopListen(); }, [sequence, stopListen]);

  useEffect(() => {
    const shouldHandleEvent = (event: InputEvent): boolean => {
      if (inputMode === 'both') {
        return true;
      }
      if (inputMode === 'midi') {
        return event.source === 'midi';
      }
      return event.source === 'computer-keyboard';
    };

    const heldNotes = new HeldNoteTracker();

    const handleInputEvent = async (event: InputEvent) => {
      if (!shouldHandleEvent(event)) {
        return;
      }

      if (event.type === 'noteon' && typeof event.note === 'number') {
        const midi = event.note;
        const change = heldNotes.press(midi, event.sourceId);
        setActiveNotes(change.activeNotes);
        if (change.shouldStartAudio) {
          await audioEngine.noteOn(midi, event.velocity ?? 0.8);
        }

        if (!isActive) {
          return;
        }

        setPlayedNotes((current) => {
          const next = [...current, midi];
          const validation = validateScaleSequence(next, currentScale, direction);
          const latest = validation[validation.length - 1];
          setLastResult({ correct: latest.correct, expected: latest.expected });
          setStatusMessage(
            latest.correct
              ? `Correct: ${PITCH_CLASS_NAMES[midi % 12]}`
              : `Expected ${PITCH_CLASS_NAMES[latest.expected % 12]}, heard ${PITCH_CLASS_NAMES[midi % 12]}.`,
          );
          return next;
        });
      }

      if (event.type === 'noteoff' && typeof event.note === 'number') {
        const change = heldNotes.release(event.note, event.sourceId);
        if (change.shouldStopAudio) {
          audioEngine.noteOff(event.note);
        }
        setActiveNotes(change.activeNotes);
      }
    };

    const unsubscribeMidi = midiInputService.subscribe((event) => {
      void handleInputEvent(event);
    });
    const unsubscribeKeyboard = keyboardInputService.subscribe((event) => {
      void handleInputEvent(event);
    });

    return () => {
      unsubscribeMidi();
      unsubscribeKeyboard();
      audioEngine.setSustain(false);
      audioEngine.allNotesOff();
    };
  }, [audioEngine, currentScale, direction, inputMode, isActive, keyboardInputService, midiInputService]);

  useEffect(() => {
    if (!metronomeEnabled || !isActive) {
      return;
    }

    let beat = 0;
    const interval = window.setInterval(() => {
      beat += 1;
      void audioEngine.playMetronomeClick(beat % 4 === 1);
    }, (60 / Math.max(40, tempo)) * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [audioEngine, isActive, metronomeEnabled, tempo]);

  useEffect(() => {
    if (!isActive || playedNotes.length === 0 || playedNotes.length < sequence.length || savedSessionRef.current) {
      return;
    }

    const validation = validateScaleSequence(playedNotes, currentScale, direction);
    const correctCount = validation.filter((entry) => entry.correct).length;
    const accuracy = (correctCount / validation.length) * 100;
    savedSessionRef.current = true;
    setIsActive(false);
    setStatusMessage(`Scale complete. Accuracy ${accuracy.toFixed(1)}%.`);
    onSessionComplete?.({
      accuracy,
      score: correctCount,
      totalQuestions: validation.length,
    });
    void window.appBridge
      ?.saveTheoryResult({
        type: 'scale-practice',
        score: correctCount,
        totalQuestions: validation.length,
        accuracy,
        details: {
          scaleName: selectedScale.name,
          root: selectedRoot,
          direction,
          octaves,
        },
      })
      .then((outcome) => {
        onAchievementsUnlocked?.(outcome?.unlockedAchievementIds ?? []);
      });
  }, [
    currentScale,
    direction,
    isActive,
    octaves,
    onAchievementsUnlocked,
    onSessionComplete,
    playedNotes,
    selectedRoot,
    selectedScale.name,
    sequence.length,
  ]);

  const progress = `${playedNotes.length} / ${sequence.length}`;

  // Derive the "active" index: current listen note, next drill note, or 0 when idle.
  const nextExpectedIndex = isActive ? playedNotes.length : null;
  const highlightIndex = isListening ? listenIndex : nextExpectedIndex;

  const upcomingNotes = useMemo(() => {
    return sequenceNotes.map((note, i) => {
      let priority: 'next' | 'soon' | 'other';
      if (highlightIndex === null) {
        priority = i === 0 ? 'next' : i === 1 ? 'soon' : 'other';
      } else {
        priority = i === highlightIndex ? 'next' : i === highlightIndex + 1 ? 'soon' : 'other';
      }
      return { midi: note.midi, hand: 'right' as const, finger: note.rh, priority };
    });
  }, [highlightIndex, sequenceNotes]);

  return (
    <main className="app-shell theory-practice-screen" onPointerDownCapture={() => void audioEngine.prepareForPlayback()}>
      <section className="panel theory-screen-hero">
        <div>
          <p className="eyebrow">Scale Practice</p>
          <h1>{PITCH_CLASS_NAMES[selectedRoot]} {selectedScale.name}</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          {onBack && (
            <button className="secondary-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <button
            className="primary-button"
            onClick={() => {
              stopListen();
              savedSessionRef.current = false;
              setPlayedNotes([]);
              setLastResult(null);
              setIsActive(true);
              setStatusMessage('Listening for the first note.');
            }}
          >
            Start Drill
          </button>
          <button className="secondary-button" onClick={() => void handleListen()}>
            {isListening ? 'Stop' : 'Listen'}
          </button>
        </div>
      </section>

      <section className="panel theory-settings-panel">
        <label>
          <span>Scale</span>
          <select value={selectedScaleName} onChange={(event) => setSelectedScaleName(event.target.value)}>
            {SCALE_DEFINITIONS.map((definition) => (
              <option key={definition.name} value={definition.name}>
                {definition.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Root</span>
          <select value={selectedRoot} onChange={(event) => setSelectedRoot(Number(event.target.value))}>
            {PITCH_CLASS_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Octaves</span>
          <select value={octaves} onChange={(event) => setOctaves(Number(event.target.value))}>
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Direction</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value as ScaleDirection)}>
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
            <option value="both">Up and Down</option>
          </select>
        </label>
        <label>
          <span>BPM</span>
          <input type="range" min={50} max={160} step={1} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} />
          <strong>{tempo}</strong>
        </label>
        <button className="secondary-button" onClick={() => setMetronomeEnabled((value) => !value)}>
          {metronomeEnabled ? 'Metronome On' : 'Metronome Off'}
        </button>
      </section>

      <section className="status-strip">
        <div className="status-card">
          <span>Progress</span>
          <strong>{progress}</strong>
        </div>
        <div className="status-card">
          <span>Direction</span>
          <strong>{direction}</strong>
        </div>
        <div className="status-card">
          <span>Last Check</span>
          <strong>{lastResult ? (lastResult.correct ? 'Correct' : 'Incorrect') : 'Waiting'}</strong>
        </div>
      </section>

      <section className="panel scale-fingering-panel">
        <p className="eyebrow">Fingering Guide</p>
        <div className="scale-fingering-rows">
          <div className="scale-fingering-row">
            <span className="fingering-hand-label">RH</span>
            {sequenceNotes.map((note, i) => (
              <div key={i} className={`fingering-cell${highlightIndex === i ? ' fingering-cell--active' : ''}`}>
                <span className="fingering-finger">{note.rh}</span>
                <span className="fingering-note">{note.name}</span>
              </div>
            ))}
          </div>
          <div className="scale-fingering-row">
            <span className="fingering-hand-label">LH</span>
            {sequenceNotes.map((note, i) => (
              <div key={i} className={`fingering-cell${highlightIndex === i ? ' fingering-cell--active' : ''}`}>
                <span className="fingering-finger">{note.lh}</span>
                <span className="fingering-note">{note.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PianoKeyboard
        activeNotes={activeNotes}
        upcomingNotes={upcomingNotes}
        highlightedNotes={currentScale.midiNotes}
        highlightColor="scale"
      />
    </main>
  );
}
