import { describe, expect, it } from 'vitest';
import { buildLessonDrill } from './drillGenerator';

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
});
