import { describe, expect, it } from 'vitest';
import { assignmentFromTrackName, defaultAssignmentForNotes } from './songUtils';

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
});
