export type IntervalName = 'P1' | 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'TT' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8';

export interface Interval {
  semitones: number;
  name: IntervalName;
  label: string;
}

export interface CompoundInterval extends Interval {
  compound: true;
}

const INTERVAL_LABELS: Record<IntervalName, string> = {
  P1: 'Perfect Unison',
  m2: 'Minor 2nd',
  M2: 'Major 2nd',
  m3: 'Minor 3rd',
  M3: 'Major 3rd',
  P4: 'Perfect 4th',
  TT: 'Tritone',
  P5: 'Perfect 5th',
  m6: 'Minor 6th',
  M6: 'Major 6th',
  m7: 'Minor 7th',
  M7: 'Major 7th',
  P8: 'Perfect Octave',
};

const INTERVAL_BY_SEMITONE: Record<number, IntervalName> = {
  0: 'P1',
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3',
  5: 'P4',
  6: 'TT',
  7: 'P5',
  8: 'm6',
  9: 'M6',
  10: 'm7',
  11: 'M7',
  12: 'P8',
};

export const ALL_INTERVALS: Interval[] = Object.entries(INTERVAL_BY_SEMITONE).map(([semitones, name]) => ({
  semitones: Number(semitones),
  name,
  label: INTERVAL_LABELS[name],
}));

function intervalFromSemitones(semitones: number): Interval {
  const normalized = semitones === 0 ? 0 : semitones % 12;
  const mapped = semitones > 0 && normalized === 0 ? 12 : normalized;
  const name = INTERVAL_BY_SEMITONE[mapped];

  return {
    semitones: mapped,
    name,
    label: INTERVAL_LABELS[name],
  };
}

export function getInterval(midiA: number, midiB: number): Interval {
  return intervalFromSemitones(Math.abs(midiB - midiA));
}

export function getCompoundInterval(semitones: number): CompoundInterval {
  if (semitones < 13) {
    return {
      ...intervalFromSemitones(semitones),
      compound: true,
    };
  }

  if (semitones === 14) {
    return { semitones, name: 'M2', label: 'Major 9th', compound: true };
  }
  if (semitones === 17) {
    return { semitones, name: 'P4', label: 'Perfect 11th', compound: true };
  }
  if (semitones === 21) {
    return { semitones, name: 'M6', label: 'Major 13th', compound: true };
  }

  return {
    ...intervalFromSemitones(semitones),
    semitones,
    label: `${intervalFromSemitones(semitones).label} (Compound)`,
    compound: true,
  };
}

export const EASY_INTERVALS: Interval[] = ALL_INTERVALS.filter((interval) =>
  ['P1', 'm3', 'M3', 'P4', 'P5', 'P8'].includes(interval.name),
);

export const MEDIUM_INTERVALS: Interval[] = [...ALL_INTERVALS];

export const HARD_INTERVALS = [
  ...ALL_INTERVALS,
  getCompoundInterval(14),
  getCompoundInterval(17),
  getCompoundInterval(21),
];
