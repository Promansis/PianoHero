import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import {
  DEFAULT_SOUNDBOARD_MODE_ID,
  SOUNDBOARD_MAX_MIDI,
  SOUNDBOARD_MIN_MIDI,
  SOUNDBOARD_MODES,
  getSoundboardClipForMidi,
  getSoundboardMode,
  type SoundboardClip,
  type SoundboardModeId,
} from '../../lib/audio/soundboardCatalog';
import { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, InputMode } from '../../lib/input/types';
import { MidiInputService } from '../../lib/midi/midiInputService';
import { midiToLabel } from '../../lib/piano/pianoLayout';
import { PianoKeyboard, type KeyboardOverlayEffect } from './PianoKeyboard';

interface NoveltySoundboardScreenProps {
  audioEngine: AudioEngine;
  midiInputService: MidiInputService;
  keyboardInputService: ComputerKeyboardInputService;
  inputMode: InputMode;
  keyboardOverlaySize: 'small' | 'medium' | 'large';
  onBackToMainMenu: () => void;
  onOpenKeyboardSetup: () => void;
}

interface FloatingEffect extends KeyboardOverlayEffect {}

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
  const [modeId, setModeId] = useState<SoundboardModeId>(DEFAULT_SOUNDBOARD_MODE_ID);
  const [showCredits, setShowCredits] = useState(false);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [keyboardOctaveShift, setKeyboardOctaveShift] = useState(keyboardInputService.getState().octaveShift);
  const effectCounterRef = useRef(0);

  const mode = useMemo(() => getSoundboardMode(modeId), [modeId]);
  const highlightedNotes = useMemo(() => mode.clips.map((clip) => clip.midi), [mode]);
  const keyLabels = useMemo(
    () => Object.fromEntries(mode.clips.map((clip) => [clip.midi, clip.shortLabel])),
    [mode],
  );
  const statusFallback = `${mode.heading}.`;
  const [statusMessage, setStatusMessage] = useState(statusFallback);

  useEffect(() => {
    setStatusMessage(mode.copy);
    setLastPlayedId(null);
    setActiveNotes([]);
    setFloatingEffects([]);
  }, [mode]);

  const spawnFloatingEffect = (clip: SoundboardClip) => {
    if (!clip.visualSrc || mode.id !== 'animals') {
      return;
    }

    const visualSrc = clip.visualSrc;
    const effectId = `${clip.id}-${effectCounterRef.current}`;
    effectCounterRef.current += 1;
    setFloatingEffects((current) => [
      ...current,
      {
        id: effectId,
        midi: clip.midi,
        src: visualSrc,
        alt: clip.label,
      },
    ]);

    window.setTimeout(() => {
      setFloatingEffects((current) => current.filter((effect) => effect.id !== effectId));
    }, 1500);
  };

  const triggerClip = async (clip: SoundboardClip) => {
    await audioEngine.playOneShot(clip.src, clip.gainDb);
    setLastPlayedId(clip.id);
    setStatusMessage(`${mode.statusTemplate(clip)} Key ${midiToLabel(clip.midi)}.`);
    spawnFloatingEffect(clip);
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

      const clip = getSoundboardClipForMidi(modeId, event.note);
      if (!clip) {
        return;
      }

      if (event.type === 'noteon') {
        const heldSources = heldByNote.get(event.note) ?? new Set<string>();
        heldSources.add(event.sourceId);
        heldByNote.set(event.note, heldSources);
        setActiveNotes([...heldByNote.keys()].sort((left, right) => left - right));
        if (heldSources.size === 1) {
          await triggerClip(clip);
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
  }, [audioEngine, inputMode, keyboardInputService, midiInputService, modeId]);

  return (
    <main className="app-shell soundboard-screen" onPointerDownCapture={() => void audioEngine.init()}>
      <section className="panel soundboard-hero">
        <div>
          <p className="eyebrow">Kids Soundboard</p>
          <h1>{mode.heading}</h1>
          <p className="song-title">{statusMessage || statusFallback}</p>
        </div>
        <div className="soundboard-hero-actions">
          <button className="secondary-button" onClick={() => setShowCredits((current) => !current)}>
            {showCredits ? 'Hide Credits' : 'Show Credits'}
          </button>
          <button className="secondary-button" onClick={onOpenKeyboardSetup}>
            Keyboard Setup
          </button>
          <button className="secondary-button" onClick={onBackToMainMenu}>
            Back to Main Menu
          </button>
        </div>
      </section>

      <section className="soundboard-mode-grid">
        {SOUNDBOARD_MODES.map((candidateMode) => (
          <button
            key={candidateMode.id}
            className={`panel soundboard-mode-card${candidateMode.id === modeId ? ' active' : ''}`}
            onClick={() => setModeId(candidateMode.id)}
          >
            <strong>{candidateMode.label}</strong>
            <span>{candidateMode.description}</span>
            <em>{candidateMode.clipSourceLabel}</em>
          </button>
        ))}
      </section>

      <section className="soundboard-summary panel">
        <div>
          <span>Input</span>
          <strong>{formatInputMode(inputMode)}</strong>
        </div>
        <div>
          <span>Mapped Sounds</span>
          <strong>{mode.clips.length}</strong>
        </div>
        <div>
          <span>Keyboard Octave</span>
          <strong>{keyboardOctaveShift >= 0 ? `+${keyboardOctaveShift}` : keyboardOctaveShift}</strong>
        </div>
      </section>

      {showCredits && (
        <section className="panel soundboard-credits-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Credits</p>
              <h2>{mode.creditsHeading}</h2>
            </div>
            <p className="panel-copy">{mode.clipSourceLabel}</p>
          </div>
          <div className="soundboard-credits-list">
            {mode.clips.map((clip) => (
              <article key={`${mode.id}-${clip.id}`} className="soundboard-credit-item">
                <strong>{clip.label}</strong>
                <span>{clip.attribution ?? clip.source}</span>
                {clip.sourcePage ? (
                  <a href={clip.sourcePage} target="_blank" rel="noreferrer">
                    {clip.sourceTitle ?? clip.source}
                  </a>
                ) : (
                  <em>{clip.sourceTitle ?? clip.source}</em>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <PianoKeyboard
        activeNotes={activeNotes}
        upcomingNotes={[]}
        highlightedNotes={highlightedNotes}
        highlightColor="chord"
        size={keyboardOverlaySize}
        keyLabels={keyLabels}
        heading={mode.id === 'animals' ? 'Animal keys and pop-up sprites' : 'Mapped novelty triggers'}
        copy={mode.copy}
        minMidi={SOUNDBOARD_MIN_MIDI}
        maxMidi={SOUNDBOARD_MAX_MIDI}
        overlayEffects={floatingEffects}
      />

      <section className="soundboard-grid">
        {mode.clips.map((clip) => (
          <button
            key={`${mode.id}-${clip.id}`}
            className={`panel soundboard-clip-card${lastPlayedId === clip.id ? ' active' : ''}`}
            onClick={() => void triggerClip(clip)}
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
