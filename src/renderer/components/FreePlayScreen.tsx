import { Midi } from '@tonejs/midi';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import { ComputerKeyboardInputService } from '../../lib/input/computerKeyboardInputService';
import type { InputEvent, InputMode } from '../../lib/input/types';
import { MidiInputService } from '../../lib/midi/midiInputService';
import type { MidiInputDevice } from '../../lib/midi/types';
import { detectChord } from '../../lib/theory/chords';
import { PianoKeyboard } from './PianoKeyboard';

interface RecordedNote {
  midi: number;
  velocity: number;
  startTimeSec: number;
  durationSec: number;
}

interface SustainEvent {
  timeSec: number;
  value: number;
}

interface FreePlayScreenProps {
  audioEngine: AudioEngine;
  midiInputService: MidiInputService;
  keyboardInputService: ComputerKeyboardInputService;
  inputMode: InputMode;
  keyboardOverlaySize: 'small' | 'medium' | 'large';
  postureReminderMinutes: number | null;
  breakReminderMinutes: number | null;
  onBackToLibrary: () => void;
  onOpenKeyboardSetup: () => void;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function makeSourceNoteKey(sourceId: string, midi: number): string {
  return `${sourceId}:${midi}`;
}

export function FreePlayScreen({
  audioEngine,
  inputMode,
  keyboardInputService,
  midiInputService,
  keyboardOverlaySize,
  postureReminderMinutes,
  breakReminderMinutes,
  onBackToLibrary,
  onOpenKeyboardSetup,
}: FreePlayScreenProps) {
  const [devices, setDevices] = useState<MidiInputDevice[]>([]);
  const [showPostureReminder, setShowPostureReminder] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(90);
  const [statusMessage, setStatusMessage] = useState('Play with MIDI or your computer keyboard to begin free practice.');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [sustainEvents, setSustainEvents] = useState<SustainEvent[]>([]);
  const [recordingClock, setRecordingClock] = useState(0);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [keyboardOctaveShift, setKeyboardOctaveShift] = useState(keyboardInputService.getState().octaveShift);
  const [chordLabel, setChordLabel] = useState<string | null>(null);
  const [backingTrackName, setBackingTrackName] = useState<string | null>(null);
  const [isBackingTrackPlaying, setIsBackingTrackPlaying] = useState(false);
  const [backingTrackVolume, setBackingTrackVolume] = useState(70);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const noteStartMapRef = useRef(new Map<string, { startTimeSec: number; velocity: number; midi: number }>());
  const playbackTimeoutsRef = useRef<number[]>([]);

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
      if (!shouldHandleEvent(event)) {
        return;
      }

      if (event.type === 'noteon' && typeof event.note === 'number') {
        const midi = event.note;
        const heldSources = heldByNote.get(midi) ?? new Set<string>();
        heldSources.add(event.sourceId);
        heldByNote.set(midi, heldSources);
        setActiveNotes([...heldByNote.keys()].sort((left, right) => left - right));

        if (heldSources.size === 1) {
          await audioEngine.noteOn(midi, event.velocity ?? 0.8);
        }

        if (isRecording && recordingStartedAt !== null) {
          noteStartMapRef.current.set(makeSourceNoteKey(event.sourceId, midi), {
            midi,
            startTimeSec: (event.timestamp - recordingStartedAt) / 1000,
            velocity: event.velocity ?? 0.8,
          });
        }
        return;
      }

      if (event.type === 'noteoff' && typeof event.note === 'number') {
        const midi = event.note;
        const heldSources = heldByNote.get(midi);
        if (heldSources) {
          heldSources.delete(event.sourceId);
          if (heldSources.size === 0) {
            heldByNote.delete(midi);
            audioEngine.noteOff(midi);
          }
          setActiveNotes([...heldByNote.keys()].sort((left, right) => left - right));
        }

        if (isRecording && recordingStartedAt !== null) {
          const started = noteStartMapRef.current.get(makeSourceNoteKey(event.sourceId, midi));
          if (started) {
            setRecordedNotes((previous) => [
              ...previous,
              {
                midi,
                velocity: started.velocity,
                startTimeSec: started.startTimeSec,
                durationSec: Math.max(0.05, (event.timestamp - recordingStartedAt) / 1000 - started.startTimeSec),
              },
            ]);
            noteStartMapRef.current.delete(makeSourceNoteKey(event.sourceId, midi));
          }
        }
        return;
      }

      if (event.type === 'pitchbend') {
        audioEngine.setPitchBend(event.pitchBendValue ?? 0);
        return;
      }

      if (event.type === 'modulation') {
        audioEngine.setModulation(event.modulationValue ?? 0);
        return;
      }

      if (event.type === 'aftertouch') {
        return;
      }

      audioEngine.setSustain((event.sustainValue ?? 0) >= 64);
      if (isRecording && recordingStartedAt !== null) {
        setSustainEvents((previous) => [
          ...previous,
          {
            timeSec: (event.timestamp - recordingStartedAt) / 1000,
            value: event.sustainValue ?? 0,
          },
        ]);
      }
    };

    const unsubscribeDevices = midiInputService.subscribeDevices((nextDevices) => {
      setDevices(nextDevices);
    });
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
      unsubscribeDevices();
      unsubscribeMidi();
      unsubscribeKeyboard();
      unsubscribeKeyboardState();
      playbackTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      playbackTimeoutsRef.current = [];
    };
  }, [audioEngine, inputMode, isRecording, keyboardInputService, midiInputService, recordingStartedAt]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setChordLabel(detectChord(activeNotes)?.label ?? null);
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeNotes]);

  useEffect(() => {
    if (!isRecording || recordingStartedAt === null) {
      return;
    }

    const interval = window.setInterval(() => {
      setRecordingClock((performance.now() - recordingStartedAt) / 1000);
    }, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRecording, recordingStartedAt]);

  useEffect(() => {
    if (!metronomeEnabled) {
      return;
    }

    let beat = 0;
    const intervalMs = (60 / Math.max(30, metronomeBpm)) * 1000;
    void audioEngine.playMetronomeClick(true);
    const interval = window.setInterval(() => {
      beat += 1;
      void audioEngine.playMetronomeClick(beat % 4 === 0);
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [audioEngine, metronomeBpm, metronomeEnabled]);

  useEffect(() => {
    if (!postureReminderMinutes) {
      return;
    }
    const interval = window.setInterval(() => {
      setShowPostureReminder(true);
    }, postureReminderMinutes * 60 * 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [postureReminderMinutes]);

  useEffect(() => {
    if (!breakReminderMinutes) {
      return;
    }
    const interval = window.setInterval(() => {
      setShowBreakReminder(true);
    }, breakReminderMinutes * 60 * 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [breakReminderMinutes]);

  const recordingDuration = useMemo(() => {
    if (isRecording) {
      return recordingClock;
    }

    return recordedNotes.reduce(
      (max, note) => Math.max(max, note.startTimeSec + note.durationSec),
      0,
    );
  }, [isRecording, recordedNotes, recordingClock]);

  const startRecording = () => {
    noteStartMapRef.current.clear();
    setRecordedNotes([]);
    setSustainEvents([]);
    setRecordingClock(0);
    setRecordingStartedAt(performance.now());
    setIsRecording(true);
    setStatusMessage('Recording keyboard and MIDI input.');
  };

  const stopRecording = () => {
    const stoppedAt = performance.now();
    if (recordingStartedAt !== null) {
      for (const started of noteStartMapRef.current.values()) {
        setRecordedNotes((previous) => [
          ...previous,
          {
            midi: started.midi,
            velocity: started.velocity,
            startTimeSec: started.startTimeSec,
            durationSec: Math.max(0.05, (stoppedAt - recordingStartedAt) / 1000 - started.startTimeSec),
          },
        ]);
      }
    }
    noteStartMapRef.current.clear();
    setIsRecording(false);
    setRecordingStartedAt(null);
    setStatusMessage('Recording captured. You can replay or export it now.');
  };

  const playRecording = async () => {
    if (recordedNotes.length === 0) {
      setStatusMessage('Record something first.');
      return;
    }

    await audioEngine.init();
    playbackTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    playbackTimeoutsRef.current = [];
    setIsPlayingRecording(true);
    setStatusMessage('Playing recorded MIDI.');

    for (const note of recordedNotes) {
      playbackTimeoutsRef.current.push(
        window.setTimeout(() => {
          setActiveNotes((previous) => [...new Set([...previous, note.midi])].sort((left, right) => left - right));
          void audioEngine.noteOn(note.midi, note.velocity);
        }, note.startTimeSec * 1000),
      );
      playbackTimeoutsRef.current.push(
        window.setTimeout(() => {
          setActiveNotes((previous) => previous.filter((value) => value !== note.midi));
          audioEngine.noteOff(note.midi);
        }, (note.startTimeSec + note.durationSec) * 1000),
      );
    }

    const totalDuration = recordedNotes.reduce(
      (max, note) => Math.max(max, note.startTimeSec + note.durationSec),
      0,
    );
    playbackTimeoutsRef.current.push(
      window.setTimeout(() => {
        setIsPlayingRecording(false);
        setStatusMessage('Playback finished.');
      }, totalDuration * 1000 + 120),
    );
  };

  const loadBackingTrack = async () => {
    if (!window.appBridge) {
      return;
    }
    const picked = await window.appBridge.pickAudioFile();
    if (!picked) {
      return;
    }
    const src = 'file:///' + picked.path.replace(/\\/g, '/');
    await audioEngine.loadBackingTrack(src);
    setBackingTrackName(picked.name);
    audioEngine.setBackingTrackVolume(backingTrackVolume);
    setIsBackingTrackPlaying(false);
    setStatusMessage(`Backing track loaded: ${picked.name}`);
  };

  const toggleBackingTrack = () => {
    if (isBackingTrackPlaying) {
      audioEngine.pauseBackingTrack();
      setIsBackingTrackPlaying(false);
    } else {
      audioEngine.playBackingTrack();
      setIsBackingTrackPlaying(true);
    }
  };

  const stopBackingTrack = () => {
    audioEngine.stopBackingTrack();
    setIsBackingTrackPlaying(false);
  };

  const handleBackingTrackVolumeChange = (value: number) => {
    setBackingTrackVolume(value);
    audioEngine.setBackingTrackVolume(value);
  };

  const exportWav = async () => {
    if (recordedNotes.length === 0 || !window.appBridge) {
      setStatusMessage('Record something before exporting.');
      return;
    }
    setIsExportingWav(true);
    setStatusMessage('Rendering WAV (this may take a moment)...');
    try {
      const duration = recordedNotes.reduce(
        (max, note) => Math.max(max, note.startTimeSec + note.durationSec),
        0,
      );
      const wavBytes = await audioEngine.renderRecordingToWav(recordedNotes, duration);
      const savedPath = await window.appBridge.saveWavFile('free-play-recording.wav', wavBytes);
      if (savedPath) {
        setStatusMessage(`WAV saved to ${savedPath}.`);
      } else {
        setStatusMessage('Export cancelled.');
      }
    } catch {
      setStatusMessage('WAV export failed. Try exporting MIDI instead.');
    } finally {
      setIsExportingWav(false);
    }
  };

  const exportRecording = async () => {
    if (recordedNotes.length === 0 || !window.appBridge) {
      setStatusMessage('Record something before exporting.');
      return;
    }

    const midi = new Midi();
    const track = midi.addTrack();
    for (const note of recordedNotes) {
      track.addNote({
        midi: note.midi,
        time: note.startTimeSec,
        duration: note.durationSec,
        velocity: note.velocity,
      });
    }
    for (const event of sustainEvents) {
      track.addCC({
        number: 64,
        time: event.timeSec,
        value: Math.max(0, Math.min(1, event.value / 127)),
      });
    }

    const savedPath = await window.appBridge.saveMidiFile('free-play-recording.mid', midi.toArray());
    if (savedPath) {
      setStatusMessage(`Saved recording to ${savedPath}.`);
    }
  };

  return (
    <main className="app-shell free-play-screen" onPointerDownCapture={() => void audioEngine.init()}>
      {showPostureReminder && (
        <section className="panel reminder-overlay">
          <div>
            <p className="eyebrow">Posture Reminder</p>
            <h2>Reset your body before continuing.</h2>
            <p className="panel-copy">Relax the shoulders, level the wrists, and keep both feet planted.</p>
          </div>
          <button className="primary-button" onClick={() => setShowPostureReminder(false)}>
            Dismiss
          </button>
        </section>
      )}

      {showBreakReminder && (
        <section className="panel reminder-overlay">
          <div>
            <p className="eyebrow">Break Reminder</p>
            <h2>Time for a short break.</h2>
            <p className="panel-copy">Step away for a few minutes to rest your hands and eyes before continuing.</p>
          </div>
          <button className="primary-button" onClick={() => setShowBreakReminder(false)}>
            Dismiss
          </button>
        </section>
      )}
      <section className="panel free-play-hero">
        <div>
          <p className="eyebrow">Free Play</p>
          <h1>Open practice without scoring.</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={onBackToLibrary}>
            Main Menu
          </button>
          <button className="secondary-button" onClick={onOpenKeyboardSetup}>
            Keyboard Setup
          </button>
          <button className="secondary-button" onClick={() => setMetronomeEnabled((value) => !value)}>
            {metronomeEnabled ? 'Metronome On' : 'Metronome Off'}
          </button>
          <button className="secondary-button" onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? 'Stop Recording' : 'Record'}
          </button>
          <button
            className="secondary-button"
            onClick={() => void playRecording()}
            disabled={isRecording || recordedNotes.length === 0 || isPlayingRecording}
          >
            Play Recording
          </button>
          <button className="secondary-button" onClick={() => void loadBackingTrack()}>
            Load Track
          </button>
          <button className="primary-button" onClick={() => void exportRecording()} disabled={recordedNotes.length === 0}>
            Export MIDI
          </button>
          <button
            className="primary-button"
            onClick={() => void exportWav()}
            disabled={recordedNotes.length === 0 || isExportingWav}
          >
            {isExportingWav ? 'Rendering...' : 'Export WAV'}
          </button>
        </div>
      </section>

      <section className="status-strip">
        <div className="status-card">
          <span>MIDI Devices</span>
          <strong>
            {devices.length > 0 ? devices.map((device) => device.name).join(', ') : 'No devices detected'}
          </strong>
        </div>
        <div className="status-card">
          <span>Input Mode</span>
          <strong>{inputMode === 'both' ? 'Both' : inputMode === 'midi' ? 'MIDI' : 'Computer Keyboard'}</strong>
        </div>
        <div className="status-card">
          <span>Keyboard Octave</span>
          <strong>{keyboardOctaveShift >= 0 ? `+${keyboardOctaveShift}` : keyboardOctaveShift}</strong>
        </div>
        <div className="status-card">
          <span>Recording</span>
          <strong>{isRecording ? formatDuration(recordingDuration) : 'Standby'}</strong>
        </div>
        <label className="status-card free-play-bpm-card">
          <span>Metronome BPM</span>
          <strong>{metronomeBpm}</strong>
          <input
            type="range"
            min={40}
            max={180}
            step={1}
            value={metronomeBpm}
            onChange={(event) => setMetronomeBpm(Number(event.target.value))}
          />
        </label>
      </section>

      {backingTrackName && (
        <section className="panel free-play-backing-track">
          <div className="backing-track-info">
            <span>Backing Track</span>
            <strong>{backingTrackName}</strong>
          </div>
          <div className="backing-track-controls">
            <button className="secondary-button" onClick={toggleBackingTrack}>
              {isBackingTrackPlaying ? 'Pause' : 'Play'}
            </button>
            <button className="secondary-button" onClick={stopBackingTrack} disabled={!isBackingTrackPlaying}>
              Stop
            </button>
            <label className="backing-track-volume">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={backingTrackVolume}
                onChange={(event) => handleBackingTrackVolumeChange(Number(event.target.value))}
              />
            </label>
          </div>
        </section>
      )}

      <section className="panel free-play-summary">
        <div>
          <span>Recorded Notes</span>
          <strong>{recordedNotes.length}</strong>
        </div>
        <div>
          <span>Sustain Events</span>
          <strong>{sustainEvents.length}</strong>
        </div>
        <div>
          <span>Playback</span>
          <strong>{isPlayingRecording ? 'Running' : 'Idle'}</strong>
        </div>
      </section>

      <PianoKeyboard activeNotes={activeNotes} upcomingNotes={[]} highlightedNotes={activeNotes} highlightColor="chord" chordLabel={chordLabel} size={keyboardOverlaySize} />
    </main>
  );
}
