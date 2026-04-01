import { startTransition, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../lib/audio/audioEngine';
import { GameSession } from '../lib/game/GameSession';
import { applyTrackAssignments, getTrackAssignments, setTrackAssignment } from '../lib/game/songUtils';
import type { ParsedSong, PlaybackSnapshot, TrackAssignment } from '../lib/game/types';
import { parseMidiFile } from '../lib/midi/midiFileParser';
import { MidiInputService } from '../lib/midi/midiInputService';
import type { MidiInputDevice } from '../lib/midi/types';
import type { SongMetadata } from '../shared/ipc';
import { ControlBar } from './components/ControlBar';
import { FallingNotesCanvas } from './components/FallingNotesCanvas';
import { PianoKeyboard } from './components/PianoKeyboard';
import { TrackAssignmentPanel } from './components/TrackAssignmentPanel';

const EMPTY_SNAPSHOT: PlaybackSnapshot = {
  isPlaying: false,
  currentTimeSec: 0,
  durationSec: 0,
  combo: 0,
  hitLineRatio: 0.86,
  visibleNotes: [],
  activeInputNotes: [],
  upcomingNotes: [],
};

type FileWithPath = File & { path?: string };

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

async function createSongId(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function App() {
  const midiServiceRef = useRef<MidiInputService | null>(null);
  const audioEngineRef = useRef(new AudioEngine());
  const gameSessionRef = useRef<GameSession | null>(null);
  const rafRef = useRef<number | null>(null);

  const [song, setSong] = useState<ParsedSong | null>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(EMPTY_SNAPSHOT);
  const [tempo, setTempo] = useState(1);
  const [devices, setDevices] = useState<MidiInputDevice[]>([]);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Import a MIDI file and connect a keyboard to begin.');
  const [sourcePath, setSourcePath] = useState<string | undefined>();

  useEffect(() => {
    const service = new MidiInputService();
    midiServiceRef.current = service;

    let unsubscribeDevices: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    service
      .init()
      .then(() => {
        unsubscribeDevices = service.subscribeDevices((nextDevices) => {
          setDevices(nextDevices);
        });
        unsubscribeMessages = service.subscribe(async (event) => {
          const game = gameSessionRef.current;
          if (!game) {
            return;
          }

          game.ingestMidiEvent(event);
          if (event.type === 'noteon' && typeof event.note === 'number') {
            await audioEngineRef.current.noteOn(event.note, event.velocity ?? 0.8);
          }
          if (event.type === 'noteoff' && typeof event.note === 'number') {
            audioEngineRef.current.noteOff(event.note);
          }
          if (event.type === 'sustain') {
            audioEngineRef.current.setSustain((event.sustainValue ?? 0) >= 64);
          }
        });
      })
      .catch((error) => {
        setMidiError((error as Error).message);
      });

    return () => {
      unsubscribeDevices?.();
      unsubscribeMessages?.();
      service.dispose();
    };
  }, []);

  useEffect(() => {
    const frame = () => {
      const game = gameSessionRef.current;
      if (game) {
        startTransition(() => {
          setSnapshot(game.getSnapshot(performance.now()));
        });
      }
      rafRef.current = window.requestAnimationFrame(frame);
    };

    rafRef.current = window.requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const ensureAudioReady = async () => {
    try {
      await audioEngineRef.current.init();
    } catch (error) {
      setStatusMessage(`Audio failed to initialize: ${(error as Error).message}`);
    }
  };

  const loadSong = async (arrayBuffer: ArrayBuffer, title: string, sourcePath?: string) => {
    const songId = await createSongId(arrayBuffer);
    const parsedSong = parseMidiFile(arrayBuffer, { songId, title });
    const storedMetadata = window.appBridge ? await window.appBridge.getSongMetadata(songId) : null;
    const hydratedSong = storedMetadata
      ? applyTrackAssignments(parsedSong, storedMetadata.trackAssignments)
      : parsedSong;

    const nextGame = new GameSession(hydratedSong, tempo);
    gameSessionRef.current = nextGame;
    setSong(hydratedSong);
    setSourcePath(sourcePath);
    setSnapshot(nextGame.getSnapshot(performance.now()));
    setStatusMessage(`Loaded ${hydratedSong.title} with ${hydratedSong.notes.length} notes across ${hydratedSong.tracks.length} tracks.`);

    if (window.appBridge) {
      await window.appBridge.saveSongMetadata(songId, {
        title,
        sourcePath,
        trackAssignments: getTrackAssignments(hydratedSong),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handlePickMidi = async () => {
    const picked = await window.appBridge?.pickMidiFile();
    if (!picked) {
      return;
    }

    await loadSong(picked.data.slice().buffer, picked.name, picked.path);
  };

  const handleDroppedFile = async (file: File) => {
    const bytes = await fileToArrayBuffer(file);
    const withPath = file as FileWithPath;
    await loadSong(bytes, file.name, withPath.path);
  };

  const handlePlayPause = async () => {
    const currentSong = song;
    const game = gameSessionRef.current;
    if (!currentSong || !game) {
      return;
    }

    const now = performance.now();
    if (game.isTransportPlaying()) {
      game.pause(now);
      audioEngineRef.current.pauseSong();
      setStatusMessage('Playback paused.');
      return;
    }

    await ensureAudioReady();
    await audioEngineRef.current.playSong(currentSong, game.getCurrentTimeSec(now), tempo);
    game.play(now);
    setStatusMessage('Playback running. Play along at the hit line.');
  };

  const handleRestart = async () => {
    const currentSong = song;
    const game = gameSessionRef.current;
    if (!currentSong || !game) {
      return;
    }

    const now = performance.now();
    const wasPlaying = game.isTransportPlaying();
    game.restart(now);
    if (wasPlaying) {
      await audioEngineRef.current.playSong(currentSong, 0, tempo);
      game.play(now);
    } else {
      audioEngineRef.current.pauseSong();
    }
  };

  const handleTempoChange = async (value: number) => {
    const game = gameSessionRef.current;
    const currentSong = song;
    setTempo(value);
    if (!game || !currentSong) {
      return;
    }

    const now = performance.now();
    const currentTime = game.getCurrentTimeSec(now);
    const shouldResume = game.isTransportPlaying();
    game.setTempo(value, now);
    await audioEngineRef.current.setTempo(currentSong, currentTime, value, shouldResume);
  };

  const handleSeek = async (progress: number) => {
    const currentSong = song;
    const game = gameSessionRef.current;
    if (!currentSong || !game) {
      return;
    }

    const now = performance.now();
    const targetSec = progress * currentSong.durationSec;
    const shouldResume = game.isTransportPlaying();
    game.seek(targetSec, now);
    if (shouldResume) {
      await audioEngineRef.current.playSong(currentSong, targetSec, tempo);
      game.play(now);
    } else {
      audioEngineRef.current.seek();
    }
  };

  const handleAssignmentChange = async (trackId: string, assignment: TrackAssignment) => {
    if (!song) {
      return;
    }

    const updatedSong = setTrackAssignment(song, trackId, assignment);
    setSong(updatedSong);

    const now = performance.now();
    const previousGame = gameSessionRef.current;
    const currentTime = previousGame?.getCurrentTimeSec(now) ?? 0;
    const wasPlaying = previousGame?.isTransportPlaying() ?? false;
    const nextGame = new GameSession(updatedSong, tempo);
    nextGame.seek(currentTime, now);
    if (wasPlaying) {
      nextGame.play(now);
      await audioEngineRef.current.playSong(updatedSong, currentTime, tempo);
    } else {
      audioEngineRef.current.pauseSong();
    }
    gameSessionRef.current = nextGame;
    setSnapshot(nextGame.getSnapshot(now));

    if (window.appBridge) {
      const metadata: SongMetadata = {
        title: updatedSong.title,
        sourcePath,
        trackAssignments: getTrackAssignments(updatedSong),
        updatedAt: new Date().toISOString(),
      };
      await window.appBridge.saveSongMetadata(updatedSong.id, metadata);
    }
  };

  const progress = song && snapshot.durationSec > 0 ? snapshot.currentTimeSec / snapshot.durationSec : 0;

  return (
    <main className="app-shell" onPointerDownCapture={ensureAudioReady}>
      <ControlBar
        canPlay={Boolean(song)}
        isPlaying={snapshot.isPlaying}
        tempo={tempo}
        progress={progress}
        songTitle={song?.title ?? 'No song loaded'}
        currentTimeLabel={formatTime(snapshot.currentTimeSec)}
        durationLabel={formatTime(snapshot.durationSec)}
        onImport={handlePickMidi}
        onPlayPause={() => void handlePlayPause()}
        onRestart={() => void handleRestart()}
        onTempoChange={(value) => void handleTempoChange(value)}
        onSeek={(value) => void handleSeek(value)}
      />

      <section className="status-strip">
        <div className="status-card">
          <span>Combo</span>
          <strong>{snapshot.combo}</strong>
        </div>
        <div className="status-card">
          <span>MIDI Devices</span>
          <strong>{devices.length > 0 ? devices.map((device) => device.name).join(', ') : 'No devices detected'}</strong>
        </div>
        <div className="status-card wide">
          <span>Status</span>
          <strong>{midiError ? `MIDI unavailable: ${midiError}` : statusMessage}</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <FallingNotesCanvas snapshot={snapshot} onFileDrop={(file) => void handleDroppedFile(file)} />
        <TrackAssignmentPanel tracks={song?.tracks ?? []} onAssignmentChange={(trackId, assignment) => void handleAssignmentChange(trackId, assignment)} />
      </section>

      <PianoKeyboard activeNotes={snapshot.activeInputNotes} upcomingNotes={snapshot.upcomingNotes} />
    </main>
  );
}
