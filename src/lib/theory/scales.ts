import { PITCH_CLASS_NAMES } from './chords';

export interface ScaleDefinition {
  name: string;
  pattern: number[];
}

export interface ScaleInstance {
  definition: ScaleDefinition;
  rootMidi: number;
  rootName: string;
  midiNotes: number[];
}

export type ScaleDirection = 'ascending' | 'descending' | 'both';

export const SCALE_DEFINITIONS: ScaleDefinition[] = [
  { name: 'Major', pattern: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Natural Minor', pattern: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Harmonic Minor', pattern: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Melodic Minor', pattern: [0, 2, 3, 5, 7, 9, 11] },
  { name: 'Chromatic', pattern: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: 'Pentatonic Major', pattern: [0, 2, 4, 7, 9] },
  { name: 'Pentatonic Minor', pattern: [0, 3, 5, 7, 10] },
];

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

function buildExpectedSequence(scale: ScaleInstance, direction: ScaleDirection): number[] {
  if (direction === 'ascending') {
    return scale.midiNotes;
  }
  if (direction === 'descending') {
    return [...scale.midiNotes].reverse();
  }

  return [...scale.midiNotes, ...scale.midiNotes.slice(0, -1).reverse()];
}

export function buildScale(
  rootPitchClass: number,
  definition: ScaleDefinition,
  octaves: number,
  startOctave = 4,
): ScaleInstance {
  const normalizedRoot = normalizePitchClass(rootPitchClass);
  const rootMidi = (startOctave + 1) * 12 + normalizedRoot;
  const midiNotes: number[] = [];

  for (let octave = 0; octave < Math.max(1, octaves); octave += 1) {
    for (const interval of definition.pattern) {
      midiNotes.push(rootMidi + octave * 12 + interval);
    }
  }
  midiNotes.push(rootMidi + Math.max(1, octaves) * 12);

  return {
    definition,
    rootMidi,
    rootName: PITCH_CLASS_NAMES[normalizedRoot],
    midiNotes,
  };
}

// Standard scale fingerings per root pitch class (0=C … 11=B).
// Each array covers one ascending octave: 7 scale notes + the octave above = 8 values.
// For diatonic scales (major, minor variants) use DIATONIC_RH / DIATONIC_LH.
// For pentatonic use PENTATONIC_RH / PENTATONIC_LH (6 values: 5 notes + octave).
// For chromatic use CHROMATIC_RH / CHROMATIC_LH (13 values: 12 semitones + octave).

const DIATONIC_RH: Record<number, number[]> = {
  0:  [1, 2, 3, 1, 2, 3, 4, 5],  // C
  1:  [2, 3, 1, 2, 3, 4, 1, 2],  // C#/Db
  2:  [1, 2, 3, 1, 2, 3, 4, 5],  // D
  3:  [3, 1, 2, 3, 4, 1, 2, 3],  // Eb/D#
  4:  [1, 2, 3, 1, 2, 3, 4, 5],  // E
  5:  [1, 2, 3, 4, 1, 2, 3, 4],  // F
  6:  [2, 3, 4, 1, 2, 3, 1, 2],  // F#/Gb
  7:  [1, 2, 3, 1, 2, 3, 4, 5],  // G
  8:  [3, 4, 1, 2, 3, 1, 2, 3],  // Ab/G#
  9:  [1, 2, 3, 1, 2, 3, 4, 5],  // A
  10: [4, 1, 2, 3, 1, 2, 3, 4],  // Bb/A#
  11: [1, 2, 3, 1, 2, 3, 4, 5],  // B
};

const DIATONIC_LH: Record<number, number[]> = {
  0:  [5, 4, 3, 2, 1, 3, 2, 1],  // C
  1:  [3, 2, 1, 4, 3, 2, 1, 3],  // C#/Db
  2:  [5, 4, 3, 2, 1, 3, 2, 1],  // D
  3:  [3, 2, 1, 4, 3, 2, 1, 3],  // Eb/D#
  4:  [5, 4, 3, 2, 1, 3, 2, 1],  // E
  5:  [5, 4, 3, 2, 1, 3, 2, 1],  // F
  6:  [4, 3, 2, 1, 3, 2, 1, 4],  // F#/Gb
  7:  [5, 4, 3, 2, 1, 3, 2, 1],  // G
  8:  [3, 2, 1, 4, 3, 2, 1, 3],  // Ab/G#
  9:  [5, 4, 3, 2, 1, 3, 2, 1],  // A
  10: [3, 2, 1, 4, 3, 2, 1, 3],  // Bb/A#
  11: [4, 3, 2, 1, 4, 3, 2, 1],  // B
};

// Pentatonic: 5 notes per octave + octave above = 6 values.
// Approximation: thumb crosses after 3rd finger (white-key roots), or 2nd/3rd start for black-key roots.
const PENTATONIC_RH: Record<number, number[]> = {
  0:  [1, 2, 3, 1, 2, 3],  // C
  1:  [2, 3, 1, 2, 1, 2],  // C#/Db
  2:  [1, 2, 3, 1, 2, 3],  // D
  3:  [2, 1, 2, 3, 1, 2],  // Eb
  4:  [1, 2, 3, 1, 2, 3],  // E
  5:  [1, 2, 3, 1, 2, 3],  // F
  6:  [2, 3, 1, 2, 3, 1],  // F#
  7:  [1, 2, 3, 1, 2, 3],  // G
  8:  [2, 3, 1, 2, 1, 2],  // Ab
  9:  [1, 2, 3, 1, 2, 3],  // A
  10: [2, 1, 2, 3, 1, 2],  // Bb
  11: [1, 2, 3, 1, 2, 3],  // B
};

const PENTATONIC_LH: Record<number, number[]> = {
  0:  [5, 4, 2, 1, 3, 1],  // C
  1:  [3, 2, 1, 3, 2, 1],  // C#/Db
  2:  [5, 4, 2, 1, 3, 1],  // D
  3:  [3, 2, 1, 4, 2, 1],  // Eb
  4:  [5, 4, 2, 1, 3, 1],  // E
  5:  [5, 4, 2, 1, 3, 1],  // F
  6:  [4, 3, 2, 1, 3, 1],  // F#
  7:  [5, 4, 2, 1, 3, 1],  // G
  8:  [3, 2, 1, 3, 2, 1],  // Ab
  9:  [5, 4, 2, 1, 3, 1],  // A
  10: [3, 2, 1, 4, 2, 1],  // Bb
  11: [5, 4, 2, 1, 3, 1],  // B
};

// Chromatic: 12 semitones + octave = 13 values.
// Thumb lands on white keys (C, D, E, F, G, A, B), 3rd finger on black keys.
const CHROMATIC_RH = [1, 3, 1, 3, 1, 1, 3, 1, 3, 1, 3, 1, 1];
const CHROMATIC_LH = [1, 3, 1, 3, 1, 1, 3, 1, 3, 1, 3, 1, 1];

function buildMultiOctaveFingering(base1Oct: number[], octaves: number): number[] {
  const inner = base1Oct.slice(0, base1Oct.length - 1);
  const result: number[] = [];
  for (let i = 0; i < octaves - 1; i++) {
    result.push(...inner);
  }
  result.push(...base1Oct);
  return result;
}

export function getScaleFingering(
  root: number,
  scaleName: string,
  octaves: number,
  direction: ScaleDirection,
): { rh: number[]; lh: number[] } {
  const r = ((root % 12) + 12) % 12;

  let baseRH: number[];
  let baseLH: number[];

  if (scaleName === 'Chromatic') {
    baseRH = CHROMATIC_RH;
    baseLH = CHROMATIC_LH;
  } else if (scaleName.includes('Pentatonic')) {
    baseRH = PENTATONIC_RH[r] ?? [1, 2, 3, 1, 2, 3];
    baseLH = PENTATONIC_LH[r] ?? [5, 4, 2, 1, 3, 1];
  } else {
    baseRH = DIATONIC_RH[r] ?? [1, 2, 3, 1, 2, 3, 4, 5];
    baseLH = DIATONIC_LH[r] ?? [5, 4, 3, 2, 1, 3, 2, 1];
  }

  const rhAsc = buildMultiOctaveFingering(baseRH, octaves);
  const lhAsc = buildMultiOctaveFingering(baseLH, octaves);

  if (direction === 'ascending') return { rh: rhAsc, lh: lhAsc };
  if (direction === 'descending') return { rh: [...rhAsc].reverse(), lh: [...lhAsc].reverse() };
  // both: up then back down (top note shared)
  return {
    rh: [...rhAsc, ...[...rhAsc].reverse().slice(1)],
    lh: [...lhAsc, ...[...lhAsc].reverse().slice(1)],
  };
}

export function validateNoteInScale(midi: number, scale: ScaleInstance): boolean {
  const pitchClass = normalizePitchClass(midi);
  return scale.definition.pattern.some((interval) => normalizePitchClass(scale.rootMidi + interval) === pitchClass);
}

export function validateScaleSequence(
  playedNotes: number[],
  scale: ScaleInstance,
  direction: ScaleDirection,
): Array<{ midi: number; correct: boolean; expected: number }> {
  const expectedSequence = buildExpectedSequence(scale, direction);
  return playedNotes.map((midi, index) => ({
    midi,
    correct: midi === expectedSequence[index],
    expected: expectedSequence[index] ?? expectedSequence[expectedSequence.length - 1],
  }));
}
