import { describe, expect, it } from 'vitest';
import { GameSession } from './GameSession';
import type { ParsedSong, SessionConfig } from './types';

const SONG: ParsedSong = {
  id: 'song-1',
  title: 'Exercise',
  ppq: 480,
  bpm: 120,
  durationSec: 3,
  tracks: [
    {
      id: 'track-0',
      name: 'Exercise',
      sourceTrackIndex: 0,
      defaultAssignment: 'right',
      assignment: 'right',
    },
  ],
  notes: [
    {
      id: 'note-0',
      trackId: 'track-0',
      midi: 60,
      name: 'C4',
      velocity: 0.8,
      startSec: 1,
      durationSec: 0.4,
      hand: 'right',
    },
    {
      id: 'note-1',
      trackId: 'track-0',
      midi: 60,
      name: 'C4',
      velocity: 0.8,
      startSec: 1.5,
      durationSec: 0.4,
      hand: 'right',
    },
  ],
};

const DEFAULT_SESSION: SessionConfig = {
  mode: 'piano-hero',
  tempoMultiplier: 1,
  handFilter: 'both',
  loopRange: null,
  waitForInput: false,
  metronomeEnabled: false,
  handSize: 'medium',
  fingeringDisplayMode: 'always',
};

describe('GameSession', () => {
  it('scores hits inside the timing window and tracks combo', () => {
    const session = new GameSession(SONG, DEFAULT_SESSION);
    session.play(0);
    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1000,
      sourceId: 'device-1',
      source: 'midi',
    });

    const snapshot = session.getSnapshot(1000);
    expect(snapshot.score.combo).toBe(1);
    expect(snapshot.score.perfectCount).toBe(1);
    expect(snapshot.visibleNotes.some((note) => note.judgement === 'perfect')).toBe(true);
  });

  it('marks overdue notes as misses', () => {
    const session = new GameSession(SONG, DEFAULT_SESSION);
    session.play(0);

    const snapshot = session.getSnapshot(1200);
    expect(snapshot.score.combo).toBe(0);
    expect(snapshot.score.missCount).toBe(1);
    expect(snapshot.visibleNotes.some((note) => note.judgement === 'miss')).toBe(true);
  });

  it('handles repeated same-pitch notes in order', () => {
    const session = new GameSession(SONG, DEFAULT_SESSION);
    session.play(0);

    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1000,
      sourceId: 'device-1',
      source: 'midi',
    });
    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1500,
      sourceId: 'device-1',
      source: 'midi',
    });

    const snapshot = session.getSnapshot(1500);
    expect(snapshot.score.combo).toBe(2);
    expect(snapshot.score.maxCombo).toBe(2);
    expect(snapshot.visibleNotes.filter((note) => note.judgement === 'perfect')).toHaveLength(2);
  });

  it('waits at the next note in learning mode until the correct note is played', () => {
    const session = new GameSession(SONG, {
      ...DEFAULT_SESSION,
      mode: 'learning',
      waitForInput: true,
    });
    session.play(0);

    expect(session.getSnapshot(1300).currentTimeSec).toBe(1);

    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.8,
      timestamp: 1300,
      sourceId: 'device-1',
      source: 'midi',
    });

    expect(session.getSnapshot(1600).currentTimeSec).toBeGreaterThan(1);
  });

  it('keeps a note active until all sources release it', () => {
    const session = new GameSession(SONG, DEFAULT_SESSION);
    session.play(0);

    session.ingestInputEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.8,
      timestamp: 900,
      sourceId: 'midi-1',
      source: 'midi',
    });
    session.ingestInputEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.8,
      timestamp: 910,
      sourceId: 'computer-keyboard',
      source: 'computer-keyboard',
    });

    session.ingestInputEvent({
      type: 'noteoff',
      note: 60,
      velocity: 0,
      timestamp: 1000,
      sourceId: 'midi-1',
      source: 'midi',
    });

    expect(session.getSnapshot(1000).activeInputNotes).toEqual([60]);

    session.ingestInputEvent({
      type: 'noteoff',
      note: 60,
      velocity: 0,
      timestamp: 1010,
      sourceId: 'computer-keyboard',
      source: 'computer-keyboard',
    });

    expect(session.getSnapshot(1010).activeInputNotes).toEqual([]);
  });

});
