import type { ParsedNote } from '../game/types';
import { PITCH_CLASS_NAMES } from './chords';

export interface DetectedKey {
  pitchClass: number;
  keyName: string;
  mode: 'major' | 'minor';
  sharps: number;
  flats: number;
  accidentalNames: string[];
}

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const SHARP_ORDER = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'];
const FLAT_ORDER = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'];

const KEY_SIGNATURES: Record<string, { sharps: number; flats: number; accidentalNames: string[] }> = {
  'C major': { sharps: 0, flats: 0, accidentalNames: [] },
  'G major': { sharps: 1, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 1) },
  'D major': { sharps: 2, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 2) },
  'A major': { sharps: 3, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 3) },
  'E major': { sharps: 4, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 4) },
  'B major': { sharps: 5, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 5) },
  'F# major': { sharps: 6, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 6) },
  'C# major': { sharps: 7, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 7) },
  'F major': { sharps: 0, flats: 1, accidentalNames: FLAT_ORDER.slice(0, 1) },
  'A# major': { sharps: 0, flats: 2, accidentalNames: FLAT_ORDER.slice(0, 2) },
  'D# major': { sharps: 0, flats: 3, accidentalNames: FLAT_ORDER.slice(0, 3) },
  'G# major': { sharps: 0, flats: 4, accidentalNames: FLAT_ORDER.slice(0, 4) },
  'C major alt': { sharps: 0, flats: 0, accidentalNames: [] },
  'A minor': { sharps: 0, flats: 0, accidentalNames: [] },
  'E minor': { sharps: 1, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 1) },
  'B minor': { sharps: 2, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 2) },
  'F# minor': { sharps: 3, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 3) },
  'C# minor': { sharps: 4, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 4) },
  'G# minor': { sharps: 5, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 5) },
  'D# minor': { sharps: 6, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 6) },
  'A# minor': { sharps: 7, flats: 0, accidentalNames: SHARP_ORDER.slice(0, 7) },
  'D minor': { sharps: 0, flats: 1, accidentalNames: FLAT_ORDER.slice(0, 1) },
  'G minor': { sharps: 0, flats: 2, accidentalNames: FLAT_ORDER.slice(0, 2) },
  'C minor': { sharps: 0, flats: 3, accidentalNames: FLAT_ORDER.slice(0, 3) },
  'F minor': { sharps: 0, flats: 4, accidentalNames: FLAT_ORDER.slice(0, 4) },
  'A# minor alt': { sharps: 0, flats: 5, accidentalNames: FLAT_ORDER.slice(0, 5) },
};

function rotateProfile(profile: number[], offset: number): number[] {
  return profile.map((_value, index) => profile[(index - offset + 12) % 12]);
}

function correlate(histogram: number[], profile: number[]): number {
  return histogram.reduce((sum, value, index) => sum + value * profile[index], 0);
}

function keyNameForPitchClass(pitchClass: number): string {
  return PITCH_CLASS_NAMES[pitchClass];
}

export function getKeySignatureInfo(pitchClass: number, mode: 'major' | 'minor'): Omit<DetectedKey, 'pitchClass'> {
  const keyName = keyNameForPitchClass(pitchClass);
  const lookupKey = `${keyName} ${mode}`;
  const fallbackKey = mode === 'major' && keyName === 'A#' ? 'A# major' : mode === 'minor' && keyName === 'A#' ? 'A# minor alt' : lookupKey;
  const signature = KEY_SIGNATURES[fallbackKey] ?? { sharps: 0, flats: 0, accidentalNames: [] };

  return {
    keyName: `${keyName} ${mode === 'major' ? 'Major' : 'Minor'}`,
    mode,
    sharps: signature.sharps,
    flats: signature.flats,
    accidentalNames: signature.accidentalNames,
  };
}

export function detectKey(notes: ParsedNote[]): DetectedKey {
  const histogram = Array.from({ length: 12 }, () => 0);
  for (const note of notes) {
    histogram[((note.midi % 12) + 12) % 12] += Math.max(note.durationSec, 0.05);
  }

  let best: { pitchClass: number; mode: 'major' | 'minor'; score: number } = {
    pitchClass: 0,
    mode: 'major',
    score: Number.NEGATIVE_INFINITY,
  };

  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    const majorScore = correlate(histogram, rotateProfile(MAJOR_PROFILE, pitchClass));
    if (majorScore > best.score) {
      best = { pitchClass, mode: 'major', score: majorScore };
    }

    const minorScore = correlate(histogram, rotateProfile(MINOR_PROFILE, pitchClass));
    if (minorScore > best.score) {
      best = { pitchClass, mode: 'minor', score: minorScore };
    }
  }

  return {
    pitchClass: best.pitchClass,
    ...getKeySignatureInfo(best.pitchClass, best.mode),
  };
}
