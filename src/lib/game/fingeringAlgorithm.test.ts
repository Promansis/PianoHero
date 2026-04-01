import { describe, expect, it } from 'vitest';
import { computeFingering } from './fingeringAlgorithm';
import type { ScheduledNote } from './types';

function createNote(
  index: number,
  midi: number,
  startSec: number,
  effectiveHand: 'left' | 'right',
): ScheduledNote {
  return {
    id: `note-${index}`,
    trackId: 'track-1',
    midi,
    name: `N${midi}`,
    velocity: 0.8,
    startSec,
    durationSec: 0.2,
    hand: effectiveHand,
    effectiveHand,
  };
}

function mapFingering(notes: ScheduledNote[], handSize: 'small' | 'medium' | 'large' = 'medium'): number[] {
  const result = computeFingering(notes, handSize);
  return notes.map((_, index) => result.get(index) ?? 0);
}

describe('computeFingering', () => {
  it('uses standard right-hand ascending scale fingering', () => {
    const notes = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, index) =>
      createNote(index, midi, index * 0.4, 'right'),
    );

    expect(mapFingering(notes)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
  });

  it('uses standard left-hand descending scale fingering', () => {
    const notes = [60, 59, 57, 55, 53, 52, 50, 48].map((midi, index) =>
      createNote(index, midi, index * 0.4, 'left'),
    );

    expect(mapFingering(notes)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
  });

  it('prefers finger 3 for an isolated note', () => {
    const notes = [createNote(0, 60, 0, 'right')];
    expect(mapFingering(notes)).toEqual([3]);
  });

  it('assigns 1-3-5 to a C major triad', () => {
    const notes = [60, 64, 67].map((midi, index) => createNote(index, midi, 0, 'right'));
    expect(mapFingering(notes)).toEqual([1, 3, 5]);
  });

  it('avoids the thumb on black keys when a nearby alternative exists', () => {
    const notes = [61, 63, 65].map((midi, index) => createNote(index, midi, index * 0.35, 'right'));
    const fingerings = mapFingering(notes);
    expect(fingerings[0]).not.toBe(1);
  });

  it('changes assignments when hand size changes on large stretches', () => {
    const notes = [60, 72].map((midi, index) => createNote(index, midi, index * 0.45, 'right'));
    expect(mapFingering(notes, 'small')).not.toEqual(mapFingering(notes, 'large'));
  });
});
