import { Midi } from '@tonejs/midi';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import { MidiInputService } from '../../lib/midi/midiInputService';
import type { MidiInputDevice } from '../../lib/midi/types';
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
  onBackToLibrary: () => void;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function FreePlayScreen({
  audioEngine,
  midiInputService,
  onBackToLibrary,
}: FreePlayScreenProps) {
  const [devices, setDevices] = useState<MidiInputDevice[]>([]);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(90);
  const [statusMessage, setStatusMessage] = useState('Play your MIDI keyboard to begin free practice.');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [sustainEvents, setSustainEvents] = useState<SustainEvent[]>([]);
  const [recordingClock, setRecordingClock] = useState(0);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const noteStartMapRef = useRef(new Map<number, { startTimeSec: number; velocity: number }>());
  const playbackTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const unsubscribeDevices = midiInputService.subscribeDevices((nextDevices) => {
      setDevices(nextDevices);
    });
    const unsubscribeMessages = midiInputService.subscribe(async (event) => {
      if (event.type === 'noteon' && typeof event.note === 'number') {
        const midi = event.note;
        setActiveNotes((previous) => [...new Set([...previous, midi])].sort((left, right) => left - right));
        await audioEngine.noteOn(midi, event.velocity ?? 0.8);
        if (isRecording && recordingStartedAt !== null) {
          noteStartMapRef.current.set(midi, {
            startTimeSec: (event.timestamp - recordingStartedAt) / 1000,
            velocity: event.velocity ?? 0.8,
          });
        }
        return;
      }

      if (event.type === 'noteoff' && typeof event.note === 'number') {
        const midi = event.note;
        setActiveNotes((previous) => previous.filter((note) => note !== midi));
        audioEngine.noteOff(midi);
        if (isRecording && recordingStartedAt !== null) {
          const started = noteStartMapRef.current.get(midi);
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
            noteStartMapRef.current.delete(midi);
          }
        }
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
    });

    return () => {
      unsubscribeDevices();
      unsubscribeMessages();
      playbackTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      playbackTimeoutsRef.current = [];
    };
  }, [audioEngine, isRecording, midiInputService, recordingStartedAt]);

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
    setStatusMessage('Recording MIDI input.');
  };

  const stopRecording = () => {
    const stoppedAt = performance.now();
    if (recordingStartedAt !== null) {
      for (const [midi, started] of noteStartMapRef.current.entries()) {
        setRecordedNotes((previous) => [
          ...previous,
          {
            midi,
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
      <section className="panel free-play-hero">
        <div>
          <p className="eyebrow">Free Play</p>
          <h1>Open practice without scoring.</h1>
          <p className="song-title">{statusMessage}</p>
        </div>
        <div className="transport-buttons">
          <button className="secondary-button" onClick={onBackToLibrary}>
            Library
          </button>
          <button className="secondary-button" onClick={() => setMetronomeEnabled((value) => !value)}>
            {metronomeEnabled ? 'Metronome On' : 'Metronome Off'}
          </button>
          <button className="secondary-button" onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? 'Stop Recording' : 'Record'}
          </button>
          <button className="secondary-button" onClick={() => void playRecording()} disabled={isRecording || recordedNotes.length === 0 || isPlayingRecording}>
            Play Recording
          </button>
          <button className="primary-button" onClick={() => void exportRecording()} disabled={recordedNotes.length === 0}>
            Export MIDI
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

      <PianoKeyboard activeNotes={activeNotes} upcomingNotes={[]} />
    </main>
  );
}

