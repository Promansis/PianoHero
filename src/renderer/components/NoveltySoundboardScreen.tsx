import { useEffect, useMemo, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import {
  SOUNDBOARD_CLIPS,
  SOUNDBOARD_MAX_MIDI,
  SOUNDBOARD_MIN_MIDI,
  getSoundboardClipForMidi,
} from '../../lib/audio/soundboardCatalog';
import { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, InputMode } from '../../lib/input/types';
import { MidiInputService } from '../../lib/midi/midiInputService';
import { midiToLabel } from '../../lib/piano/pianoLayout';
import { PianoKeyboard } from './PianoKeyboard';

interface NoveltySoundboardScreenProps {
  audioEngine: AudioEngine;
  midiInputService: MidiInputService;
  keyboardInputService: ComputerKeyboardInputService;
  inputMode: InputMode;
  keyboardOverlaySize: 'small' | 'medium' | 'large';
  onBackToMainMenu: () => void;
  onOpenKeyboardSetup: () => void;
}

function formatInputMode(inputMode: InputMode): string {
  if (inputMode === 'both') {
    return 'Both';
  }
  if (inputMode === 'midi') {
    return 'MIDI';
  }
  return 'Computer Keyboard';
}

export function NoveltySoundboardScreen({
  audioEngine,
  midiInputService,
  keyboardInputService,
  inputMode,
  keyboardOverlaySize,
  onBackToMainMenu,
  onOpenKeyboardSetup,
}: NoveltySoundboardScreenProps) {
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Play the highlighted piano keys to trigger novelty sounds.');
  const [keyboardOctaveShift, setKeyboardOctaveShift] = useState(keyboardInputService.getState().octaveShift);

  const keyLabels = useMemo(
    () => Object.fromEntries(SOUNDBOARD_CLIPS.map((clip) => [clip.midi, clip.shortLabel])),
    [],
  );

  const triggerClip = async (midi: number) => {
    const clip = getSoundboardClipForMidi(midi);
    if (!clip) {
      return;
    }

    await audioEngine.playOneShot(clip.src, clip.gainDb);
    setLastPlayedId(clip.id);
    setStatusMessage(`Played ${clip.label} on ${midiToLabel(clip.midi)}.`);
  };

  useEffect(() => {
    const heldByNote = new Map<number, Set<string>>();

    const shouldHandleEvent = (event: InputEvent): boolean => {
      if (inputMode === 'both') {
        return true;
      }
      if (inputMode === 'midi') {
        return event.source === 'midi';
      }
      return event.source === 'computer-keyboard';
    };

    const handleInputEvent = async (event: InputEvent) => {
      if (!shouldHandleEvent(event) || typeof event.note !== 'number') {
        return;
      }

      const clip = getSoundboardClipForMidi(event.note);
      if (!clip) {
        return;
      }

      if (event.type === 'noteon') {
        const heldSources = heldByNote.get(event.note) ?? new Set<string>();
        heldSources.add(event.sourceId);
        heldByNote.set(event.note, heldSources);
        setActiveNotes([...heldByNote.keys()].sort((left, right) => left - right));
        if (heldSources.size === 1) {
          await triggerClip(event.note);
        }
        return;
      }

      if (event.type === 'noteoff') {
        const heldSources = heldByNote.get(event.note);
        if (!heldSources) {
          return;
        }

        heldSources.delete(event.sourceId);
        if (heldSources.size === 0) {
          heldByNote.delete(event.note);
        }
        setActiveNotes([...heldByNote.keys()].sort((left, right) => left - right));
      }
    };

    const unsubscribeMidi = midiInputService.subscribe((event) => {
      void handleInputEvent(event);
    });
    const unsubscribeKeyboard = keyboardInputService.subscribe((event) => {
      void handleInputEvent(event);
    });
    const unsubscribeKeyboardState = keyboardInputService.subscribeState((state) => {
      setKeyboardOctaveShift(state.octaveShift);
    });

    return () => {
      unsubscribeMidi();
      unsubscribeKeyboard();
      unsubscribeKeyboardState();
    };
  }, [audioEngine, inputMode, keyboardInputService, midiInputService]);

  return (
    <main className="app-shell soundboard-screen" onPointerDownCapture={() => void audioEngine.init()}>
      <section className="panel soundboard-hero">
        <div>
          <p className="eyebrow">Kids Soundboard</p>
          <h1>Play novelty sounds from the keyboard</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="soundboard-hero-actions">
          <button className="secondary-button" onClick={onOpenKeyboardSetup}>
            Keyboard Setup
          </button>
          <button className="secondary-button" onClick={onBackToMainMenu}>
            Back to Main Menu
          </button>
        </div>
      </section>

      <section className="soundboard-summary panel">
        <div>
          <span>Input</span>
          <strong>{formatInputMode(inputMode)}</strong>
        </div>
        <div>
          <span>Mapped Sounds</span>
          <strong>{SOUNDBOARD_CLIPS.length}</strong>
        </div>
        <div>
          <span>Keyboard Octave</span>
          <strong>{keyboardOctaveShift >= 0 ? `+${keyboardOctaveShift}` : keyboardOctaveShift}</strong>
        </div>
      </section>

      <PianoKeyboard
        activeNotes={activeNotes}
        upcomingNotes={[]}
        highlightedNotes={SOUNDBOARD_CLIPS.map((clip) => clip.midi)}
        highlightColor="chord"
        size={keyboardOverlaySize}
        keyLabels={keyLabels}
        heading="Mapped novelty triggers"
        copy="Use your piano or the computer-keyboard piano mapping. Only labeled keys trigger sounds."
        minMidi={SOUNDBOARD_MIN_MIDI}
        maxMidi={SOUNDBOARD_MAX_MIDI}
      />

      <section className="soundboard-grid">
        {SOUNDBOARD_CLIPS.map((clip) => (
          <button
            key={clip.id}
            className={`panel soundboard-clip-card${lastPlayedId === clip.id ? ' active' : ''}`}
            onClick={() => void triggerClip(clip.midi)}
          >
            <span className="soundboard-shortcut">{midiToLabel(clip.midi)}</span>
            <strong>{clip.label}</strong>
            <span>{clip.category}</span>
            <em>{clip.source}</em>
          </button>
        ))}
      </section>
    </main>
  );
}
