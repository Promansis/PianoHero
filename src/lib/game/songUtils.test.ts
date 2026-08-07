import { describe, expect, it } from 'vitest';
import {
  assignmentFromTrackName,
  defaultAssignmentForNotes,
  getLoopRangeSeconds,
  getMeasureCount,
  getMeasureIndexForTime,
} from './songUtils';
import type { ParsedSong } from './types';

describe('songUtils hand assignment fallback', () => {
  it('prefers explicit left/right hints from track names', () => {
    expect(assignmentFromTrackName('LH Bass')).toBe('left');
    expect(assignmentFromTrackName('Right Hand Melody')).toBe('right');
  });

  it('falls back to pitch centroid with C4 as the split point', () => {
    expect(defaultAssignmentForNotes([{ midi: 48 }, { midi: 55 }, { midi: 59 }], 'Piano')).toBe('left');
    expect(defaultAssignmentForNotes([{ midi: 60 }, { midi: 64 }, { midi: 72 }], 'Piano')).toBe('right');
    expect(defaultAssignmentForNotes([{ midi: 55 }, { midi: 65 }], 'Piano')).toBe('right');
  });

  it('uses per-note C4 splitting only when a track cannot be classified', () => {
    expect(defaultAssignmentForNotes([], 'Untitled')).toBe('both');
  });

  it('uses parsed measure boundaries for scoring and loops', () => {
    const song = {
      id: 'metered',
      title: 'Metered',
      ppq: 480,
      bpm: 120,
      durationSec: 3,
      tracks: [],
      notes: [],
      measureBoundaries: [
        { startTick: 0, endTick: 1440, startSec: 0, endSec: 1.5 },
        { startTick: 1440, endTick: 2880, startSec: 1.5, endSec: 3 },
      ],
    } satisfies ParsedSong;

    expect(getMeasureIndexForTime(song, 1.5)).toBe(1);
    expect(getMeasureCount(song)).toBe(2);
    expect(getLoopRangeSeconds(song, { startMeasure: 1, endMeasure: 1 })).toEqual({
      startSec: 1.5,
      endSec: 3,
    });
  });
});
