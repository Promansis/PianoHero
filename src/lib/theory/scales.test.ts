import { describe, expect, it } from 'vitest';
import { buildScale, SCALE_DEFINITIONS, validateNoteInScale, validateScaleSequence } from './scales';

describe('scales', () => {
  it('builds a two octave major scale', () => {
    const scale = buildScale(0, SCALE_DEFINITIONS[0], 2, 4);
    expect(scale.rootName).toBe('C');
    expect(scale.midiNotes).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84]);
  });

  it('validates notes in scale by pitch class', () => {
    const scale = buildScale(0, SCALE_DEFINITIONS[0], 1, 4);
    expect(validateNoteInScale(72, scale)).toBe(true);
    expect(validateNoteInScale(61, scale)).toBe(false);
  });

  it('validates an ascending sequence', () => {
    const scale = buildScale(0, SCALE_DEFINITIONS[0], 1, 4);
    expect(validateScaleSequence([60, 62, 63], scale, 'ascending')).toEqual([
      { midi: 60, correct: true, expected: 60 },
      { midi: 62, correct: true, expected: 62 },
      { midi: 63, correct: false, expected: 64 },
    ]);
  });
});
