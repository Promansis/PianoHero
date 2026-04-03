export const MIN_MIDI = 21;
export const MAX_MIDI = 108;
export const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export interface KeyLayout {
  midi: number;
  note: string;
  isBlack: boolean;
  left: number;
}

function buildWhiteKeys(): number[] {
  const whiteKeys: number[] = [];
  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi += 1) {
    if (!BLACK_CLASSES.has(midi % 12)) {
      whiteKeys.push(midi);
    }
  }
  return whiteKeys;
}

function whiteBeforeMidi(targetMidi: number): number {
  let count = 0;
  for (let midi = MIN_MIDI; midi <= targetMidi; midi += 1) {
    if (!BLACK_CLASSES.has(midi % 12)) {
      count += 1;
    }
  }
  return count;
}

function midiToLabel(midi: number): string {
  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${pitchNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export const WHITE_KEYS = buildWhiteKeys();
export const WHITE_KEY_WIDTH = 100 / WHITE_KEYS.length;

export function buildKeyLayout(): KeyLayout[] {
  const whiteIndexMap = new Map<number, number>();
  WHITE_KEYS.forEach((midi, index) => {
    whiteIndexMap.set(midi, index);
  });

  const offsets: Record<number, number> = {
    1: 0.65,
    3: 1.55,
    6: 3.65,
    8: 4.55,
    10: 5.45,
  };

  const layout: KeyLayout[] = [];
  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi += 1) {
    const pitchClass = midi % 12;
    const note = midiToLabel(midi);
    const isBlack = BLACK_CLASSES.has(pitchClass);

    if (!isBlack) {
      const left = (whiteIndexMap.get(midi) ?? 0) * WHITE_KEY_WIDTH;
      layout.push({ midi, note, isBlack, left });
      continue;
    }

    const priorWhiteCount = whiteBeforeMidi(midi);
    const left = (priorWhiteCount - 1 + (offsets[pitchClass] ?? 0.5)) * WHITE_KEY_WIDTH;
    const normalizedLeft = Math.max(0, Math.min(100 - WHITE_KEY_WIDTH * 0.6, left));
    layout.push({ midi, note, isBlack, left: normalizedLeft });
  }

  return layout;
}

export const KEY_LAYOUT = buildKeyLayout();

// Lookup table for fast access: index = midi - MIN_MIDI
const KEY_POSITION_CACHE = new Array<{ leftPercent: number; widthPercent: number }>(MAX_MIDI - MIN_MIDI + 1);
for (const key of KEY_LAYOUT) {
  KEY_POSITION_CACHE[key.midi - MIN_MIDI] = {
    leftPercent: key.left,
    widthPercent: key.isBlack ? WHITE_KEY_WIDTH * 0.6 : WHITE_KEY_WIDTH,
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
