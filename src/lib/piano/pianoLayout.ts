export const MIN_MIDI = 21;
export const MAX_MIDI = 108;
export const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);
export const BLACK_KEY_WIDTH = 0.6;

export interface KeyLayout {
  midi: number;
  note: string;
  isBlack: boolean;
  left: number;
}

function buildWhiteKeys(minMidi = MIN_MIDI, maxMidi = MAX_MIDI): number[] {
  const whiteKeys: number[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    if (!BLACK_CLASSES.has(midi % 12)) {
      whiteKeys.push(midi);
    }
  }
  return whiteKeys;
}

export function midiToLabel(midi: number): string {
  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${pitchNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function isBlackMidi(midi: number): boolean {
  return BLACK_CLASSES.has(midi % 12);
}

function blackKeyLeft(
  blackMidi: number,
  whiteIndexMap: Map<number, number>,
  whiteKeyWidth: number,
  minMidi = MIN_MIDI,
  maxMidi = MAX_MIDI,
): number {
  let previousWhiteMidi: number | null = null;
  let nextWhiteMidi: number | null = null;

  for (let midi = blackMidi - 1; midi >= minMidi; midi -= 1) {
    if (!isBlackMidi(midi)) {
      previousWhiteMidi = midi;
      break;
    }
  }

  for (let midi = blackMidi + 1; midi <= maxMidi; midi += 1) {
    if (!isBlackMidi(midi)) {
      nextWhiteMidi = midi;
      break;
    }
  }

  if (previousWhiteMidi === null || nextWhiteMidi === null) {
    return 0;
  }

  const previousWhiteIndex = whiteIndexMap.get(previousWhiteMidi) ?? 0;
  const nextWhiteIndex = whiteIndexMap.get(nextWhiteMidi) ?? previousWhiteIndex + 1;
  const boundaryIndex = nextWhiteIndex;

  return (boundaryIndex - BLACK_KEY_WIDTH / 2) * whiteKeyWidth;
}

export const WHITE_KEYS = buildWhiteKeys();
export const WHITE_KEY_WIDTH = 100 / WHITE_KEYS.length;

export function buildKeyRangeLayout(minMidi = MIN_MIDI, maxMidi = MAX_MIDI): KeyLayout[] {
  const whiteKeys = buildWhiteKeys(minMidi, maxMidi);
  const whiteKeyWidth = 100 / whiteKeys.length;
  const whiteIndexMap = new Map<number, number>();
  whiteKeys.forEach((midi, index) => {
    whiteIndexMap.set(midi, index);
  });

  const layout: KeyLayout[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    const pitchClass = midi % 12;
    const note = midiToLabel(midi);
    const isBlack = BLACK_CLASSES.has(pitchClass);

    if (!isBlack) {
      const left = (whiteIndexMap.get(midi) ?? 0) * whiteKeyWidth;
      layout.push({ midi, note, isBlack, left });
      continue;
    }

    const left = blackKeyLeft(midi, whiteIndexMap, whiteKeyWidth, minMidi, maxMidi);
    const normalizedLeft = Math.max(0, Math.min(100 - whiteKeyWidth * BLACK_KEY_WIDTH, left));
    layout.push({ midi, note, isBlack, left: normalizedLeft });
  }

  return layout;
}

export function buildKeyLayout(): KeyLayout[] {
  return buildKeyRangeLayout(MIN_MIDI, MAX_MIDI);
}

export const KEY_LAYOUT = buildKeyLayout();

// Lookup table for fast access: index = midi - MIN_MIDI
const KEY_POSITION_CACHE = new Array<{ leftPercent: number; widthPercent: number }>(MAX_MIDI - MIN_MIDI + 1);
for (const key of KEY_LAYOUT) {
  KEY_POSITION_CACHE[key.midi - MIN_MIDI] = {
    leftPercent: key.left,
    widthPercent: key.isBlack ? WHITE_KEY_WIDTH * BLACK_KEY_WIDTH : WHITE_KEY_WIDTH,
  };
}

export function getKeyPosition(midi: number): { leftPercent: number; widthPercent: number } {
  const idx = midi - MIN_MIDI;
  if (idx >= 0 && idx < KEY_POSITION_CACHE.length) {
    return KEY_POSITION_CACHE[idx];
  }
  return { leftPercent: 0, widthPercent: WHITE_KEY_WIDTH };
}

// MIDI note numbers for C in each octave within the keyboard range (for grid lines)
export const OCTAVE_C_MIDI = [24, 36, 48, 60, 72, 84, 96] as const; // C1–C7
