import { describe, expect, it } from 'vitest';
import type { ParsedNote } from '../game/types';
import { detectKey, getKeySignatureInfo } from './keyDetection';

function createNote(id: number, midi: number): ParsedNote {
  return {
    id: `n-${id}`,
    trackId: 'track-0',
    midi,
    name: '',
    velocity: 0.8,
    startSec: id * 0.5,
    durationSec: 0.5,
    hand: midi < 60 ? 'left' : 'right',
  };
}

describe('keyDetection', () => {
  it('detects C major from a simple scale fragment', () => {
    const notes = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, index) => createNote(index, midi));
    expect(detectKey(notes)).toMatchObject({
      pitchClass: 0,
      keyName: 'C Major',
      mode: 'major',
      sharps: 0,
      flats: 0,
    });
  });

  it('returns key signature metadata', () => {
    expect(getKeySignatureInfo(7, 'major')).toMatchObject({
      keyName: 'G Major',
      sharps: 1,
      accidentalNames: ['F#'],
    });
  });
});
