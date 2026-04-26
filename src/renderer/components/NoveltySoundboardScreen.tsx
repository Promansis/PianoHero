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
import { AnimalSoundboardCanvas, type AnimalSoundboardBurst } from './AnimalSoundboardCanvas';
import { PianoKeyboard, type KeyboardKeyLabel, type KeyboardOverlayEffect } from './PianoKeyboard';

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
interface TimedAnimalBurst extends AnimalSoundboardBurst {}

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
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [animalBursts, setAnimalBursts] = useState<TimedAnimalBurst[]>([]);
  const [isAnimalMapPinned, setIsAnimalMapPinned] = useState(false);
  const [isAnimalMapHovered, setIsAnimalMapHovered] = useState(false);
  const [keyboardOctaveShift, setKeyboardOctaveShift] = useState(keyboardInputService.getState().octaveShift);
  const effectCounterRef = useRef(0);
  const animalStageRef = useRef<HTMLDivElement | null>(null);
  const animalMapButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const oneShotPlaybackLockedRef = useRef(false);
  const oneShotUnlockTimeoutRef = useRef<number | null>(null);

  const mode = useMemo(() => getSoundboardMode(modeId), [modeId]);
  const highlightedNotes = useMemo(() => mode.clips.map((clip) => clip.midi), [mode]);
  const keyLabels = useMemo(
    () =>
      Object.fromEntries(
        mode.clips.map((clip) => [
          clip.midi,
          {
            text: mode.id === 'animals' ? clip.emoji ?? clip.shortLabel : clip.shortLabel,
            title: clip.label,
            ariaLabel: `${midiToLabel(clip.midi)} key: ${clip.label}`,
          } satisfies KeyboardKeyLabel,
        ]),
      ),
    [mode],
  );
  const statusFallback = `${mode.heading}.`;
  const [statusMessage, setStatusMessage] = useState(statusFallback);

  useEffect(() => {
    setStatusMessage(mode.copy);
    setLastPlayedId(null);
    setActiveNotes([]);
    setFloatingEffects([]);
    setAnimalBursts([]);
    setIsAnimalMapHovered(false);
    setIsAnimalMapPinned(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (oneShotUnlockTimeoutRef.current !== null) {
        window.clearTimeout(oneShotUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      if (overlayVisible) {
        closeOverlay(true);
        return;
      }
      setOverlayVisible(true);
    };

    window.addEventListener('keydown', handleEscape, true);
    return () => {
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [overlayVisible]);

  useEffect(() => {
    if (!(isAnimalMapPinned && mode.id === 'animals')) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const stage = animalStageRef.current;
      if (!stage || stage.contains(event.target as Node)) {
        return;
      }
      closeAnimalMap(true);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isAnimalMapPinned, mode.id]);

  const spawnFloatingEffect = (clip: SoundboardClip) => {
    if (!clip.visualSrc || mode.id === 'animals') {
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

  const spawnAnimalBurst = (clip: SoundboardClip) => {
    if (mode.id !== 'animals' || !clip.emoji) {
      return;
    }

    const burstId = `${clip.id}-burst-${effectCounterRef.current}`;
    const clipIndex = mode.clips.findIndex((candidate) => candidate.id === clip.id);
    const lane =
      (clip.midi - SOUNDBOARD_MIN_MIDI) / Math.max(1, SOUNDBOARD_MAX_MIDI - SOUNDBOARD_MIN_MIDI);
    const normalizedX = 0.06 + lane * 0.88;
    const randomSeed = Math.random();
    const burst: TimedAnimalBurst = {
      id: burstId,
      clipId: clip.id,
      emoji: clip.emoji,
      label: clip.label,
      accent: clip.accent ?? '#ffb86b',
      startX: normalizedX,
      startY: 0.92,
      targetY: 0.06 + Math.random() * 0.27,
      durationMs: 1900 + randomSeed * 1100,
      wobbleAmplitude: 0.018 + Math.random() * 0.028,
      wobbleFrequency: 1.4 + Math.random() * 1.9,
      wobblePhase: Math.random() * Math.PI * 2,
      createdAt: performance.now(),
    };
    setAnimalBursts((current) => [...current.slice(-11), burst]);
    window.setTimeout(() => {
      setAnimalBursts((current) => current.filter((item) => item.id !== burstId));
    }, burst.durationMs + 460);
  };

  const triggerClip = async (clip: SoundboardClip) => {
    setLastPlayedId(clip.id);
    setStatusMessage(`${mode.statusTemplate(clip)} Key ${midiToLabel(clip.midi)}.`);
    spawnFloatingEffect(clip);
    spawnAnimalBurst(clip);

    if (oneShotPlaybackLockedRef.current) {
      return;
    }

    oneShotPlaybackLockedRef.current = true;
    try {
      const durationMs = Math.max(100, (await audioEngine.getOneShotDurationSec(clip.src)) * 1000);
      if (oneShotUnlockTimeoutRef.current !== null) {
        window.clearTimeout(oneShotUnlockTimeoutRef.current);
      }
      oneShotUnlockTimeoutRef.current = window.setTimeout(() => {
        oneShotPlaybackLockedRef.current = false;
        oneShotUnlockTimeoutRef.current = null;
      }, durationMs);
      await audioEngine.playOneShot(clip.src, clip.gainDb);
    } catch {
      oneShotPlaybackLockedRef.current = false;
      if (oneShotUnlockTimeoutRef.current !== null) {
        window.clearTimeout(oneShotUnlockTimeoutRef.current);
        oneShotUnlockTimeoutRef.current = null;
      }
    }
  };

  const isAnimalMode = mode.id === 'animals';
  const isAnimalMapOpen = isAnimalMode && (isAnimalMapPinned || isAnimalMapHovered);
  const stageStatus = lastPlayedId
    ? mode.clips.find((clip) => clip.id === lastPlayedId)?.label ?? 'Ready'
    : 'Ready';
  const focusAfterClose = (ref: { current: HTMLButtonElement | null }) => {
    window.requestAnimationFrame(() => {
      ref.current?.focus();
    });
  };
  const closeOverlay = (returnFocus = false) => {
    setOverlayVisible(false);
    if (returnFocus) {
      focusAfterClose(menuButtonRef);
    }
  };
  const closeAnimalMap = (returnFocus = false) => {
    setIsAnimalMapPinned(false);
    setIsAnimalMapHovered(false);
    if (returnFocus) {
      focusAfterClose(animalMapButtonRef);
    }
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
    <main
      className="app-shell soundboard-screen app-shell-immersive animal-soundboard-shell"
      onPointerDownCapture={() => void audioEngine.prepareForPlayback()}
    >
      <div className="immersive-hud animal-soundboard-hud">
        <div className="immersive-hud-stats">
          <div className="immersive-hud-item">
            <span>Mode</span>
            <strong>{mode.label}</strong>
          </div>
          <div className="immersive-hud-item">
            <span>Input</span>
            <strong>{formatInputMode(inputMode)}</strong>
          </div>
          <div className="immersive-hud-item">
            <span>Keyboard</span>
            <strong>{keyboardOctaveShift >= 0 ? `+${keyboardOctaveShift}` : keyboardOctaveShift}</strong>
          </div>
          <div className="immersive-hud-item">
            <span>Status</span>
            <strong>{stageStatus}</strong>
          </div>
        </div>
        <div className="animal-soundboard-hud-actions">
          {isAnimalMode ? (
            <button
              className="immersive-menu-btn animal-map-toggle"
              ref={animalMapButtonRef}
              aria-label="Show animal key map"
              aria-controls="animal-key-map-popout"
              aria-expanded={isAnimalMapOpen}
              onClick={() => {
                if (isAnimalMapOpen) {
                  closeAnimalMap(true);
                  return;
                }
                setIsAnimalMapPinned(true);
                setIsAnimalMapHovered(false);
              }}
              onMouseEnter={() => setIsAnimalMapHovered(true)}
              onMouseLeave={() => {
                if (!isAnimalMapPinned) {
                  setIsAnimalMapHovered(false);
                }
              }}
              onFocus={() => setIsAnimalMapHovered(true)}
              onBlur={() => {
                if (!isAnimalMapPinned) {
                  setIsAnimalMapHovered(false);
                }
              }}
            >
              🐾
            </button>
          ) : null}
          <button
            className="immersive-menu-btn"
            ref={menuButtonRef}
            aria-controls="soundboard-overlay-panel"
            aria-expanded={overlayVisible}
            onClick={() => setOverlayVisible(true)}
          >
            Menu
          </button>
        </div>
      </div>

      <div
        className="immersive-canvas-area animal-soundboard-stage"
        ref={animalStageRef}
        onMouseLeave={() => {
          if (!isAnimalMapPinned) {
            setIsAnimalMapHovered(false);
          }
        }}
      >
        <AnimalSoundboardCanvas clips={mode.clips} activeNotes={activeNotes} recentBursts={animalBursts} />

        {isAnimalMode ? (
          <section
            className={`panel animal-soundboard-map-popout${isAnimalMapOpen ? ' open' : ''}`}
            id="animal-key-map-popout"
            aria-label="Animal key map"
            aria-hidden={!isAnimalMapOpen}
            data-testid="animal-key-map-popout"
            onMouseEnter={() => setIsAnimalMapHovered(true)}
            onMouseLeave={() => {
              if (!isAnimalMapPinned) {
                setIsAnimalMapHovered(false);
              }
            }}
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Animal Key Map</p>
                <h2>Tap any animal</h2>
              </div>
              <p className="panel-copy">Hover the paw or pin this popout to keep it open.</p>
            </div>
            <div className="soundboard-grid">
              {mode.clips.map((clip) => (
                <button
                  key={`${mode.id}-${clip.id}`}
                  className={`panel soundboard-clip-card${lastPlayedId === clip.id ? ' active' : ''}`}
                  onClick={() => void triggerClip(clip)}
                  title={`${clip.label} (${midiToLabel(clip.midi)})`}
                >
                  <span className="soundboard-shortcut">{midiToLabel(clip.midi)}</span>
                  <strong>{clip.emoji ? `${clip.emoji} ${clip.label}` : clip.label}</strong>
                  <span>{clip.category}</span>
                  <em>{clip.source}</em>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="immersive-keyboard animal-soundboard-keyboard">
        <PianoKeyboard
          activeNotes={activeNotes}
          upcomingNotes={[]}
          highlightedNotes={highlightedNotes}
          highlightColor="chord"
          size={keyboardOverlaySize}
          keyLabels={keyLabels}
          heading={isAnimalMode ? 'Animal keys and pop-up sprites' : 'Mapped novelty triggers'}
          copy={mode.copy}
          minMidi={SOUNDBOARD_MIN_MIDI}
          maxMidi={SOUNDBOARD_MAX_MIDI}
          overlayEffects={floatingEffects}
        />
      </div>

      {overlayVisible && (
        <div
          className="immersive-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeOverlay(true);
            }
          }}
        >
          <div
            className="immersive-overlay-panel soundboard-overlay-panel"
            id="soundboard-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="soundboard-overlay-title"
          >
            <div className="immersive-overlay-header">
              <h2 id="soundboard-overlay-title">{mode.label} Soundboard</h2>
              <div className="immersive-overlay-actions">
                <button className="primary-button" onClick={() => closeOverlay(true)}>
                  Resume
                </button>
                <button className="secondary-button" onClick={onBackToMainMenu}>
                  Back to Main Menu
                </button>
              </div>
            </div>

            <section className="status-strip">
              <div className="status-card">
                <span>Mode</span>
                <strong>{mode.label}</strong>
              </div>
              <div className="status-card">
                <span>Input Mode</span>
                <strong>{formatInputMode(inputMode)}</strong>
              </div>
              <div className="status-card">
                <span>Keyboard Octave</span>
                <strong>{keyboardOctaveShift >= 0 ? `+${keyboardOctaveShift}` : keyboardOctaveShift}</strong>
              </div>
              <div className="status-card">
                <span>Mapped Sounds</span>
                <strong>{mode.clips.length}</strong>
              </div>
              <div className="status-card wide">
                <span>Status</span>
                <strong>{statusMessage}</strong>
              </div>
            </section>

            <section className="panel soundboard-overlay-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Soundboard Modes</p>
                  <h2>Choose your stage</h2>
                </div>
                <p className="panel-copy">Switch modes without leaving the immersive soundboard.</p>
              </div>
              <div className="soundboard-mode-grid soundboard-overlay-mode-grid">
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
              </div>
            </section>

            <section className="panel soundboard-overlay-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Soundboard Controls</p>
                  <h2>Keep the keyboard live</h2>
                </div>
              </div>
              <div className="transport-buttons">
                <button className="secondary-button" onClick={onOpenKeyboardSetup}>
                  Keyboard Setup
                </button>
                <button className={showCredits ? 'primary-button' : 'secondary-button'} onClick={() => setShowCredits((current) => !current)}>
                  {showCredits ? 'Hide Credits' : 'Show Credits'}
                </button>
              </div>
            </section>

            <section className="panel soundboard-overlay-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{isAnimalMode ? 'Animal Key Map' : 'Soundboard Grid'}</p>
                  <h2>{isAnimalMode ? 'Tap any animal' : 'Tap any sound'}</h2>
                </div>
                <p className="panel-copy">{mode.copy}</p>
              </div>
              <div className="soundboard-grid soundboard-overlay-grid">
                {mode.clips.map((clip) => (
                  <button
                    key={`${mode.id}-${clip.id}`}
                    className={`panel soundboard-clip-card${lastPlayedId === clip.id ? ' active' : ''}`}
                    onClick={() => void triggerClip(clip)}
                    title={`${clip.label} (${midiToLabel(clip.midi)})`}
                  >
                    <span className="soundboard-shortcut">{midiToLabel(clip.midi)}</span>
                    <strong>{clip.emoji ? `${clip.emoji} ${clip.label}` : clip.label}</strong>
                    <span>{clip.category}</span>
                    <em>{clip.source}</em>
                  </button>
                ))}
              </div>
            </section>

            {showCredits ? (
              <section className="panel soundboard-overlay-section soundboard-credits-panel">
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
                      <strong>{clip.emoji ? `${clip.emoji} ${clip.label}` : clip.label}</strong>
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
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
