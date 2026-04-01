import { startTransition, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../../lib/audio/audioEngine';
import { GameSession } from '../../lib/game/GameSession';
import {
  applyTrackAssignments,
  filterSongByHand,
  getLoopRangeSeconds,
  getTrackAssignments,
  setTrackAssignment,
} from '../../lib/game/songUtils';
import type {
  ParsedSong,
  PlaybackSnapshot,
  SessionConfig,
  SessionMode,
  TrackAssignment,
} from '../../lib/game/types';
import { parseMidiFile } from '../../lib/midi/midiFileParser';
import { MidiInputService } from '../../lib/midi/midiInputService';
import type { MidiInputDevice } from '../../lib/midi/types';
import type { SongRow, UserStatsRow } from '../../shared/dbTypes';
import { ControlBar } from './ControlBar';
import { FallingNotesCanvas } from './FallingNotesCanvas';
import { PianoKeyboard } from './PianoKeyboard';
import { TrackAssignmentPanel } from './TrackAssignmentPanel';

const EMPTY_SNAPSHOT: PlaybackSnapshot = {
  isPlaying: false,
  currentTimeSec: 0,
  durationSec: 0,
  combo: 0,
  hitLineRatio: 0.86,
  visibleNotes: [],
  activeInputNotes: [],
  upcomingNotes: [],
  score: {
    totalScore: 0,
    combo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    accuracy: 100,
    perfectCount: 0,
    goodCount: 0,
    okCount: 0,
    missCount: 0,
    totalNotes: 0,
    judgedNotes: 0,
    measureAccuracy: [],
  },
};

type FileWithPath = File & { path?: string };

interface FinishedGamePayload {
  result: ReturnType<GameSession['getFinalResult']>;
  song: SongRow;
  sessionConfig: SessionConfig;
  baselineStats: UserStatsRow | null;
}

interface GameScreenProps {
  audioEngine: AudioEngine;
  midiInputService: MidiInputService;
  song: SongRow;
  initialSessionConfig: SessionConfig;
  onGameFinished: (payload: FinishedGamePayload) => void;
  onBackToLibrary: () => void;
}

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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function composeSessionSong(sourceSong: ParsedSong, sessionConfig: SessionConfig): ParsedSong {
  return filterSongByHand(sourceSong, sessionConfig.handFilter);
}

function shouldAutoplayMode(mode: SessionMode): boolean {
  return mode === 'piano-hero' || mode === 'performance';
}

function loopStartForSong(song: ParsedSong | null, sessionConfig: SessionConfig): number {
  if (!song) {
    return 0;
  }
  return getLoopRangeSeconds(song, sessionConfig.loopRange).startSec;
}

function buildTempSong(filePath: string, title: string): SongRow {
  return {
    id: `temp-${title}`,
    title,
    artist: '',
    genre: '',
    filePath,
    difficulty: 1,
    durationSec: 0,
    bpm: 120,
    noteCount: 0,
    dateAdded: new Date().toISOString(),
    timesPlayed: 0,
    tags: [],
    isFavorite: false,
    trackAssignments: {},
  };
}

export function GameScreen({
  audioEngine,
  midiInputService,
  song,
  initialSessionConfig,
  onGameFinished,
  onBackToLibrary,
}: GameScreenProps) {
  const gameSessionRef = useRef<GameSession | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevPlayingRef = useRef(false);
  const songEndedRef = useRef(false);
  const currentSongRef = useRef(song);
  const baselineStatsRef = useRef<UserStatsRow | null>(null);

  const [sourceSong, setSourceSong] = useState<ParsedSong | null>(null);
  const [sessionSong, setSessionSong] = useState<ParsedSong | null>(null);
  const [sessionConfig, setSessionConfig] = useState(initialSessionConfig);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(EMPTY_SNAPSHOT);
  const [devices, setDevices] = useState<MidiInputDevice[]>([]);
  const [statusMessage, setStatusMessage] = useState('Loading song from the library.');
  const [reminderFrequencyMinutes, setReminderFrequencyMinutes] = useState<number | null>(null);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    setSessionConfig(initialSessionConfig);
  }, [initialSessionConfig]);

  useEffect(() => {
    const unsubscribeDevices = midiInputService.subscribeDevices((nextDevices) => {
      setDevices(nextDevices);
    });
    const unsubscribeMessages = midiInputService.subscribe(async (event) => {
      const game = gameSessionRef.current;
      if (!game) {
        return;
      }

      game.ingestMidiEvent(event);
      if (event.type === 'noteon' && typeof event.note === 'number') {
        await audioEngine.noteOn(event.note, event.velocity ?? 0.8);
      }
      if (event.type === 'noteoff' && typeof event.note === 'number') {
        audioEngine.noteOff(event.note);
      }
      if (event.type === 'sustain') {
        audioEngine.setSustain((event.sustainValue ?? 0) >= 64);
      }
    });

    return () => {
      unsubscribeDevices();
      unsubscribeMessages();
    };
  }, [audioEngine, midiInputService]);

  useEffect(() => {
    const frame = () => {
      const game = gameSessionRef.current;
      if (game) {
        const nextSnapshot = game.getSnapshot(performance.now());
        const activeSong = currentSongRef.current;

        if (
          !songEndedRef.current &&
          prevPlayingRef.current &&
          !nextSnapshot.isPlaying &&
          !game.getSessionConfig().loopRange &&
          nextSnapshot.currentTimeSec >= game.getSong().durationSec &&
          game.getSong().durationSec > 0
        ) {
          songEndedRef.current = true;
          onGameFinished({
            result: game.getFinalResult(),
            song: activeSong,
            sessionConfig: game.getSessionConfig(),
            baselineStats: baselineStatsRef.current,
          });
        }

        prevPlayingRef.current = nextSnapshot.isPlaying;
        startTransition(() => {
          setSnapshot(nextSnapshot);
        });
      }
      rafRef.current = window.requestAnimationFrame(frame);
    };

    rafRef.current = window.requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      audioEngine.pauseSong();
    };
  }, [audioEngine, onGameFinished]);

  useEffect(() => {
    const loadSelectedSong = async () => {
      if (!window.appBridge) {
        setStatusMessage('The app bridge is unavailable.');
        return;
      }

      currentSongRef.current = song;
      baselineStatsRef.current = await window.appBridge.getUserStats(song.id);

      const reminderValue = await window.appBridge.getSetting('practice', 'postureReminderMinutes');
      setReminderFrequencyMinutes(
        reminderValue && reminderValue !== 'off' ? Number(reminderValue) || null : null,
      );

      try {
        const bytes = await window.appBridge.loadMidiFileData(song.filePath);
        await loadSongFromBytes(toArrayBuffer(bytes), song, initialSessionConfig);
      } catch (error) {
        setStatusMessage(`Unable to load song: ${(error as Error).message}`);
      }
    };

    void loadSelectedSong();
  }, [initialSessionConfig, song]);

  useEffect(() => {
    if (!reminderFrequencyMinutes) {
      return;
    }

    const interval = window.setInterval(() => {
      setShowReminder(true);
    }, reminderFrequencyMinutes * 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [reminderFrequencyMinutes]);

  const ensureAudioReady = async () => {
    try {
      await audioEngine.init();
    } catch (error) {
      setStatusMessage(`Audio failed to initialize: ${(error as Error).message}`);
    }
  };

  const mountSession = async (
    nextSourceSong: ParsedSong,
    nextSessionConfig: SessionConfig,
    options: { keepTime?: boolean; currentTimeSec?: number } = {},
  ) => {
    const filteredSong = composeSessionSong(nextSourceSong, nextSessionConfig);
    const nextGame = new GameSession(filteredSong, nextSessionConfig);
    const now = performance.now();
    if (options.keepTime && typeof options.currentTimeSec === 'number') {
      nextGame.seek(options.currentTimeSec, now);
    }

    gameSessionRef.current = nextGame;
    setSourceSong(nextSourceSong);
    setSessionSong(filteredSong);
    setSnapshot(nextGame.getSnapshot(now));
    songEndedRef.current = false;
    prevPlayingRef.current = false;
  };

  const loadSongFromBytes = async (
    arrayBuffer: ArrayBuffer,
    songRecord: SongRow,
    nextSessionConfig: SessionConfig,
  ) => {
    const parsedSong = parseMidiFile(arrayBuffer, {
      songId: songRecord.id,
      title: songRecord.title,
    });
    const hydratedSong = applyTrackAssignments(parsedSong, songRecord.trackAssignments);
    currentSongRef.current = {
      ...songRecord,
      durationSec: hydratedSong.durationSec,
      bpm: hydratedSong.bpm,
      noteCount: hydratedSong.notes.length,
      trackAssignments: getTrackAssignments(hydratedSong),
    };
    await mountSession(hydratedSong, nextSessionConfig);
    setStatusMessage(
      `Loaded ${hydratedSong.title} with ${hydratedSong.notes.length} notes across ${hydratedSong.tracks.length} tracks.`,
    );
  };

  const rebuildForSessionConfig = async (nextSessionConfig: SessionConfig) => {
    const currentSourceSong = sourceSong;
    const previousGame = gameSessionRef.current;
    setSessionConfig(nextSessionConfig);
    if (!currentSourceSong || !previousGame) {
      return;
    }

    const now = performance.now();
    const currentTime = previousGame.getCurrentTimeSec(now);
    const wasPlaying = previousGame.isTransportPlaying();
    await mountSession(currentSourceSong, nextSessionConfig, {
      keepTime: true,
      currentTimeSec: currentTime,
    });

    if (wasPlaying && shouldAutoplayMode(nextSessionConfig.mode)) {
      const nextGame = gameSessionRef.current;
      const nextSong = composeSessionSong(currentSourceSong, nextSessionConfig);
      if (nextGame && nextSong) {
        await audioEngine.playSong(nextSong, nextGame.getCurrentTimeSec(now), nextSessionConfig.tempoMultiplier);
        nextGame.play(now);
      }
    } else {
      audioEngine.pauseSong();
    }
  };

  const handlePickMidi = async () => {
    const picked = await window.appBridge?.pickMidiFile();
    if (!picked) {
      return;
    }

    const nextSongId = await createSongId(toArrayBuffer(picked.data));
    const tempSong = buildTempSong(picked.path ?? '', picked.name.replace(/\.(mid|midi)$/i, ''));
    tempSong.id = nextSongId;
    currentSongRef.current = tempSong;
    baselineStatsRef.current = null;
    await loadSongFromBytes(toArrayBuffer(picked.data), tempSong, sessionConfig);
  };

  const handleDroppedFile = async (file: File) => {
    const bytes = await file.arrayBuffer();
    const nextSongId = await createSongId(bytes);
    const withPath = file as FileWithPath;
    const tempSong = buildTempSong(withPath.path ?? '', file.name.replace(/\.(mid|midi)$/i, ''));
    tempSong.id = nextSongId;
    currentSongRef.current = tempSong;
    baselineStatsRef.current = null;
    await loadSongFromBytes(bytes, tempSong, sessionConfig);
  };

  const handlePlayPause = async () => {
    const currentSessionSong = sessionSong;
    const game = gameSessionRef.current;
    if (!currentSessionSong || !game) {
      return;
    }

    const now = performance.now();
    if (game.isTransportPlaying()) {
      game.pause(now);
      audioEngine.pauseSong();
      setStatusMessage('Playback paused.');
      return;
    }

    await ensureAudioReady();
    if (shouldAutoplayMode(sessionConfig.mode)) {
      await audioEngine.playSong(currentSessionSong, game.getCurrentTimeSec(now), sessionConfig.tempoMultiplier);
    }
    game.play(now);
    setStatusMessage(
      sessionConfig.mode === 'learning'
        ? 'Learning mode active. Progress pauses until the correct note is played.'
        : 'Playback running. Play along at the hit line.',
    );
  };

  const handleRestart = async () => {
    const currentSessionSong = sessionSong;
    const game = gameSessionRef.current;
    if (!currentSessionSong || !game) {
      return;
    }

    songEndedRef.current = false;
    prevPlayingRef.current = false;
    const now = performance.now();
    const wasPlaying = game.isTransportPlaying();
    game.restart(now);
    if (wasPlaying && shouldAutoplayMode(sessionConfig.mode)) {
      await audioEngine.playSong(currentSessionSong, loopStartForSong(currentSessionSong, sessionConfig), sessionConfig.tempoMultiplier);
      game.play(now);
    } else {
      audioEngine.pauseSong();
    }
  };

  const handleTempoChange = async (value: number) => {
    const game = gameSessionRef.current;
    const currentSessionSong = sessionSong;
    const nextSessionConfig = {
      ...sessionConfig,
      tempoMultiplier: value,
    };
    setSessionConfig(nextSessionConfig);
    if (!game || !currentSessionSong) {
      return;
    }

    const now = performance.now();
    const currentTime = game.getCurrentTimeSec(now);
    const shouldResume = game.isTransportPlaying() && shouldAutoplayMode(nextSessionConfig.mode);
    game.updateSessionConfig(nextSessionConfig, now);
    game.setTempo(value, now);
    await audioEngine.setTempo(currentSessionSong, currentTime, value, shouldResume);
  };

  const handleSeek = async (progress: number) => {
    const currentSessionSong = sessionSong;
    const game = gameSessionRef.current;
    if (!currentSessionSong || !game) {
      return;
    }

    const now = performance.now();
    const loopStart = loopStartForSong(currentSessionSong, sessionConfig);
    const targetSec = loopStart + progress * snapshot.durationSec;
    const shouldResume = game.isTransportPlaying() && shouldAutoplayMode(sessionConfig.mode);
    game.seek(targetSec, now);
    if (shouldResume) {
      await audioEngine.playSong(currentSessionSong, targetSec, sessionConfig.tempoMultiplier);
      game.play(now);
    } else {
      audioEngine.seek();
    }
  };

  const handleAssignmentChange = async (trackId: string, assignment: TrackAssignment) => {
    if (!sourceSong) {
      return;
    }

    const updatedSourceSong = setTrackAssignment(sourceSong, trackId, assignment);
    const updatedSongRecord: SongRow = {
      ...currentSongRef.current,
      trackAssignments: getTrackAssignments(updatedSourceSong),
    };
    currentSongRef.current = updatedSongRecord;

    const previousGame = gameSessionRef.current;
    const now = performance.now();
    const currentTime = previousGame?.getCurrentTimeSec(now) ?? 0;
    const wasPlaying = previousGame?.isTransportPlaying() ?? false;
    await mountSession(updatedSourceSong, sessionConfig, {
      keepTime: true,
      currentTimeSec: currentTime,
    });

    if (wasPlaying && shouldAutoplayMode(sessionConfig.mode) && gameSessionRef.current) {
      await audioEngine.playSong(composeSessionSong(updatedSourceSong, sessionConfig), currentTime, sessionConfig.tempoMultiplier);
      gameSessionRef.current.play(now);
    }

    if (window.appBridge && !updatedSongRecord.id.startsWith('temp-')) {
      await window.appBridge.updateSong(updatedSongRecord.id, {
        title: updatedSongRecord.title,
        filePath: updatedSongRecord.filePath,
        trackAssignments: updatedSongRecord.trackAssignments,
      });
    }
  };

  const loopStart = loopStartForSong(sessionSong, sessionConfig);
  const progress = snapshot.durationSec > 0 ? (snapshot.currentTimeSec - loopStart) / snapshot.durationSec : 0;
  const currentTimeLabel = formatTime(snapshot.currentTimeSec - loopStart);
  const durationLabel = formatTime(snapshot.durationSec);

  return (
    <main className="app-shell" onPointerDownCapture={() => void ensureAudioReady()}>
      <ControlBar
        canPlay={Boolean(sessionSong)}
        isPlaying={snapshot.isPlaying}
        tempo={sessionConfig.tempoMultiplier}
        progress={Math.max(0, Math.min(1, progress))}
        songTitle={currentSongRef.current.title}
        currentTimeLabel={currentTimeLabel}
        durationLabel={durationLabel}
        onImport={() => void handlePickMidi()}
        onPlayPause={() => void handlePlayPause()}
        onRestart={() => void handleRestart()}
        onTempoChange={(value) => void handleTempoChange(value)}
        onSeek={(value) => void handleSeek(value)}
        onBackToLibrary={() => {
          audioEngine.pauseSong();
          onBackToLibrary();
        }}
      />

      <section className="status-strip">
        <div className="status-card">
          <span>Mode</span>
          <strong>{sessionConfig.mode === 'piano-hero' ? 'Piano Hero' : 'Learning'}</strong>
        </div>
        <div className="status-card">
          <span>Score</span>
          <strong>{snapshot.score.totalScore.toLocaleString()}</strong>
        </div>
        <div className="status-card">
          <span>Combo</span>
          <strong>
            {snapshot.score.combo} x{snapshot.score.comboMultiplier.toFixed(1)}
          </strong>
        </div>
        <div className="status-card">
          <span>Accuracy</span>
          <strong>{snapshot.score.accuracy.toFixed(1)}%</strong>
        </div>
        <div className="status-card wide">
          <span>Status</span>
          <strong>{statusMessage}</strong>
        </div>
      </section>

      <section className="panel session-toolbar">
        <div className="session-chip-group">
          <button
            className={sessionConfig.mode === 'piano-hero' ? 'primary-button' : 'secondary-button'}
            onClick={() => void rebuildForSessionConfig({ ...sessionConfig, mode: 'piano-hero', waitForInput: false })}
          >
            Piano Hero
          </button>
          <button
            className={sessionConfig.mode === 'learning' ? 'primary-button' : 'secondary-button'}
            onClick={() => void rebuildForSessionConfig({ ...sessionConfig, mode: 'learning', waitForInput: true })}
          >
            Learning Mode
          </button>
        </div>
        <div className="session-chip-group">
          {(['both', 'left', 'right'] as const).map((handFilter) => (
            <button
              key={handFilter}
              className={sessionConfig.handFilter === handFilter ? 'primary-button' : 'secondary-button'}
              onClick={() => void rebuildForSessionConfig({ ...sessionConfig, handFilter })}
            >
              {handFilter === 'both' ? 'Both Hands' : `${handFilter[0].toUpperCase()}${handFilter.slice(1)} Hand`}
            </button>
          ))}
        </div>
        <div className="session-chip-group">
          {sessionConfig.loopRange ? (
            <>
              <span className="loop-label">
                Looping measures {sessionConfig.loopRange.startMeasure + 1}-{sessionConfig.loopRange.endMeasure + 1}
              </span>
              <button
                className="secondary-button"
                onClick={() => void rebuildForSessionConfig({ ...sessionConfig, loopRange: null })}
              >
                Clear Loop
              </button>
            </>
          ) : (
            <span className="loop-label">Full song session</span>
          )}
        </div>
      </section>

      {showReminder && (
        <section className="panel reminder-overlay">
          <div>
            <p className="eyebrow">Posture Reminder</p>
            <h2>Reset your body before the next repetition.</h2>
            <p className="panel-copy">Relax the shoulders, level the wrists, and keep both feet planted.</p>
          </div>
          <button className="primary-button" onClick={() => setShowReminder(false)}>
            Dismiss
          </button>
        </section>
      )}

      <section className="workspace-grid">
        <FallingNotesCanvas
          snapshot={snapshot}
          onFileDrop={(file) => {
            void handleDroppedFile(file);
          }}
        />
        <TrackAssignmentPanel
          tracks={sourceSong?.tracks ?? []}
          onAssignmentChange={(trackId, assignment) => {
            void handleAssignmentChange(trackId, assignment);
          }}
        />
      </section>

      <section className="status-strip compact-strip">
        <div className="status-card wide">
          <span>MIDI Devices</span>
          <strong>
            {devices.length > 0 ? devices.map((device) => device.name).join(', ') : 'No devices detected'}
          </strong>
        </div>
      </section>

      <PianoKeyboard activeNotes={snapshot.activeInputNotes} upcomingNotes={snapshot.upcomingNotes} />
    </main>
  );
}



