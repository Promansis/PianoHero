import { describe, expect, it } from 'vitest';
import { GameSession } from './GameSession';
import type { ParsedSong } from './types';

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

describe('GameSession', () => {
  it('scores hits inside the timing window and tracks combo', () => {
    const session = new GameSession(SONG);
    session.play(0);
    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1000,
      sourceId: 'device-1',
    });

    const snapshot = session.getSnapshot(1000);
    expect(snapshot.combo).toBe(1);
    expect(snapshot.visibleNotes.some((note) => note.judgement === 'hit')).toBe(true);
  });

  it('marks pending notes as missed after the hit window', () => {
    const session = new GameSession(SONG);
    session.play(0);

    const snapshot = session.getSnapshot(1200);
    expect(snapshot.combo).toBe(0);
    expect(snapshot.visibleNotes.some((note) => note.judgement === 'miss')).toBe(true);
  });

  it('handles repeated same-pitch notes in order', () => {
    const session = new GameSession(SONG);
    session.play(0);

    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1000,
      sourceId: 'device-1',
    });
    session.ingestMidiEvent({
      type: 'noteon',
      note: 60,
      velocity: 0.9,
      timestamp: 1500,
      sourceId: 'device-1',
    });

    const snapshot = session.getSnapshot(1500);
    expect(snapshot.combo).toBe(2);
    expect(snapshot.visibleNotes.filter((note) => note.judgement === 'hit')).toHaveLength(2);
  });
});
