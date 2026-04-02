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
