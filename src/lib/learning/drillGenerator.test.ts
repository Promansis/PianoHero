import { describe, expect, it } from 'vitest';
import { GameSession } from '../game/GameSession';
import type { SessionConfig } from '../game/types';
import { buildLessonDrill, buildRhythmClappingDrill } from './drillGenerator';

const SCORING_SESSION: SessionConfig = {
  mode: 'luma-keys',
  tempoMultiplier: 1,
  handFilter: 'both',
  loopRange: null,
  waitForInput: false,
  metronomeEnabled: false,
  handSize: 'medium',
  fingeringDisplayMode: 'always',
  pitchBendEnabled: true,
  latencyCompMs: 0,
  hitWindowMs: 100,
  beatsVisible: 8,
  leadInBeats: 2,
};

describe('buildLessonDrill', () => {
  it('uses white-key scale tones for five-finger drills', () => {
    const song = buildLessonDrill('Right Hand Five Finger', {
      kind: 'five-finger-pattern',
      bpm: 80,
      startMidi: 60,
      handMode: 'right',
      direction: 'ascending',
      repetitions: 1,
    });

    expect(song.notes.map((note) => note.midi)).toEqual([60, 62, 64, 65, 67]);
  });

  it('places parallel five-finger drills in mirrored C positions', () => {
    const song = buildLessonDrill('Parallel Five Finger', {
      kind: 'five-finger-pattern',
      bpm: 80,
      startMidi: 60,
      handMode: 'parallel',
      direction: 'ascending',
      repetitions: 1,
    });

    expect(song.notes.filter((note) => note.hand === 'left').map((note) => note.midi)).toEqual([48, 50, 52, 53, 55]);
    expect(song.notes.filter((note) => note.hand === 'right').map((note) => note.midi)).toEqual([60, 62, 64, 65, 67]);
  });

  it('creates a parsed song with nondecreasing note start times', () => {
    const song = buildLessonDrill('Five Finger Parallel', {
      kind: 'five-finger-pattern',
      bpm: 80,
      startMidi: 60,
      handMode: 'parallel',
      direction: 'up-down',
      repetitions: 1,
    });

    expect(song.notes.length).toBeGreaterThan(0);
    const startTimes = song.notes.map((note) => note.startSec);
    expect(startTimes).toEqual([...startTimes].sort((left, right) => left - right));
    expect(song.durationSec).toBeGreaterThan(song.notes[0].durationSec);
  });

  it('assigns both hands and matching track ids for parallel drills', () => {
    const song = buildLessonDrill('Parallel Motion', {
      kind: 'motion-pattern',
      bpm: 76,
      startMidi: 60,
      intervals: [0, 2, 4],
      handMode: 'parallel',
      repetitions: 1,
    });

    expect(song.tracks.map((track) => track.assignment)).toEqual(['left', 'right']);
    expect(song.notes.some((note) => note.hand === 'left')).toBe(true);
    expect(song.notes.some((note) => note.hand === 'right')).toBe(true);
    expect(song.notes.every((note) => note.trackId === 'left-track' || note.trackId === 'right-track')).toBe(true);
  });

  it('hands generated drills to GameSession as scoreable scheduled notes', () => {
    const song = buildLessonDrill('Right Hand Walk Contract', {
      kind: 'five-finger-pattern',
      bpm: 80,
      startMidi: 60,
      handMode: 'right',
      direction: 'ascending',
      repetitions: 1,
    });
    const session = new GameSession(song, SCORING_SESSION);

    session.play(0);
    for (const note of song.notes) {
      session.ingestInputEvent({
        type: 'noteon',
        source: 'midi',
        sourceId: 'contract-keyboard',
        timestamp: note.startSec * 1000,
        note: note.midi,
        velocity: 0.9,
      });
    }

    const result = session.getFinalResult();
    expect(result).toMatchObject({
      songId: song.id,
      mode: 'luma-keys',
      perfectHits: song.notes.length,
      misses: 0,
      accuracy: 100,
    });
    expect(result.measureAccuracy.every((entry) => entry.accuracy === 100)).toBe(true);
  });

  it('turns rhythm-clapping steps into Space-compatible middle-C scoring events', () => {
    const song = buildRhythmClappingDrill({
      kind: 'rhythm-clapping',
      title: 'Quarter And Half Clap',
      bpm: 60,
      patternBeats: [1, 0.5, 1.5],
      measures: 2,
    });
    const session = new GameSession(song, SCORING_SESSION);

    expect(song.tracks).toMatchObject([{ id: 'right-track', assignment: 'right' }]);
    expect(new Set(song.notes.map((note) => note.midi))).toEqual(new Set([60]));
    expect(song.notes.map((note) => note.startSec)).toEqual([0, 1, 1.5, 3, 4, 4.5]);

    session.play(0);
    for (const note of song.notes) {
      session.ingestInputEvent({
        type: 'noteon',
        source: 'computer-keyboard',
        sourceId: 'computer-keyboard:space-clap',
        timestamp: note.startSec * 1000,
        note: 60,
        velocity: 0.9,
      });
      session.ingestInputEvent({
        type: 'noteoff',
        source: 'computer-keyboard',
        sourceId: 'computer-keyboard:space-clap',
        timestamp: note.startSec * 1000 + 80,
        note: 60,
      });
    }

    const result = session.getFinalResult();
    expect(result).toMatchObject({
      perfectHits: song.notes.length,
      misses: 0,
      accuracy: 100,
    });
  });
});
