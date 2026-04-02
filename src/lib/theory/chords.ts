export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface ChordTemplate {
  intervals: number[];
  quality: string;
}

export interface ChordMatch {
  root: number;
  rootName: string;
  quality: string;
  label: string;
  notes: number[];
}

export const CHORD_TEMPLATES: ChordTemplate[] = [
  { intervals: [0, 4, 7], quality: 'maj' },
  { intervals: [0, 3, 7], quality: 'min' },
  { intervals: [0, 3, 6], quality: 'dim' },
  { intervals: [0, 4, 8], quality: 'aug' },
  { intervals: [0, 4, 7, 11], quality: 'maj7' },
  { intervals: [0, 3, 7, 10], quality: 'min7' },
  { intervals: [0, 4, 7, 10], quality: 'dom7' },
  { intervals: [0, 3, 6, 9], quality: 'dim7' },
  { intervals: [0, 3, 6, 10], quality: 'm7b5' },
];

function normalizePitchClasses(midiNotes: number[]): number[] {
  return [...new Set(midiNotes.map((note) => ((note % 12) + 12) % 12))].sort((left, right) => left - right);
}

function buildChordLabel(rootName: string, quality: string): string {
  switch (quality) {
    case 'maj':
      return `${rootName}maj`;
    case 'min':
      return `${rootName}min`;
    default:
      return `${rootName}${quality}`;
  }
}

export function detectChord(midiNotes: number[]): ChordMatch | null {
  if (midiNotes.length < 3) {
    return null;
  }

  const pitchClasses = normalizePitchClasses(midiNotes);
  if (pitchClasses.length < 3) {
    return null;
  }

  const bassPitchClass = ((Math.min(...midiNotes) % 12) + 12) % 12;
  const candidates = Array.from({ length: 12 }, (_value, index) => index).sort((left, right) => {
    if (left === bassPitchClass) {
      return -1;
    }
    if (right === bassPitchClass) {
      return 1;
    }
    return left - right;
  });

  const exactMatches: Array<{ template: ChordTemplate; root: number }> = [];
  for (const root of candidates) {
    const intervalSet = pitchClasses.map((pitchClass) => (pitchClass - root + 12) % 12).sort((left, right) => left - right);
    for (const template of CHORD_TEMPLATES) {
      if (
        intervalSet.length === template.intervals.length &&
        intervalSet.every((interval, index) => interval === template.intervals[index])
      ) {
        exactMatches.push({ template, root });
      }
    }
  }

  if (exactMatches.length === 0) {
    return null;
  }

  const best = exactMatches[0];
  const rootName = PITCH_CLASS_NAMES[best.root];

  return {
    root: best.root,
    rootName,
    quality: best.template.quality,
    label: buildChordLabel(rootName, best.template.quality),
    notes: [...pitchClasses],
  };
}
