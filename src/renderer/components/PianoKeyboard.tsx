import type { Hand } from '../../lib/game/types';

interface PianoKeyboardProps {
  activeNotes: number[];
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number }>;
}

interface KeyLayout {
  midi: number;
  note: string;
  isBlack: boolean;
  left: number;
}

const MIN_MIDI = 21;
const MAX_MIDI = 108;
const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);
const WHITE_KEYS = buildWhiteKeys();
const WHITE_KEY_WIDTH = 100 / WHITE_KEYS.length;
const KEY_LAYOUT = buildKeyLayout();

function buildWhiteKeys(): number[] {
  const whiteKeys: number[] = [];
  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi += 1) {
    if (!BLACK_CLASSES.has(midi % 12)) {
      whiteKeys.push(midi);
    }
  }
  return whiteKeys;
}

function buildKeyLayout(): KeyLayout[] {
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

function upcomingMap(
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number }>,
): Map<number, { hand: Hand; finger?: number }> {
  return new Map(upcomingNotes.map((note) => [note.midi, { hand: note.hand, finger: note.finger }]));
}

export function PianoKeyboard({ activeNotes, upcomingNotes }: PianoKeyboardProps) {
  const activeSet = new Set(activeNotes);
  const upcoming = upcomingMap(upcomingNotes);
  const whiteKeys = KEY_LAYOUT.filter((key) => !key.isBlack);
  const blackKeys = KEY_LAYOUT.filter((key) => key.isBlack);

  return (
    <section className="keyboard-shell panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Keyboard</p>
          <h2>Live + upcoming notes</h2>
        </div>
        <p className="panel-copy">Blue cues the left hand. Orange cues the right.</p>
      </div>

      <div className="keyboard-stage">
        <div className="white-keys">
          {whiteKeys.map((key) => {
            const cue = upcoming.get(key.midi);
            const isActive = activeSet.has(key.midi);
            return (
              <div
                key={key.midi}
                className={`white-key ${isActive ? 'active' : ''} ${cue ? `cue-${cue.hand}` : ''}`}
                style={{ width: `${WHITE_KEY_WIDTH}%` }}
                title={key.note}
              >
                <span>{key.note.startsWith('C') ? key.note : ''}</span>
                {cue?.finger !== undefined && <strong className="key-finger">{cue.finger}</strong>}
              </div>
            );
          })}
        </div>

        <div className="black-keys">
          {blackKeys.map((key) => {
            const cue = upcoming.get(key.midi);
            const isActive = activeSet.has(key.midi);
            return (
              <div
                key={key.midi}
                className={`black-key ${isActive ? 'active' : ''} ${cue ? `cue-${cue.hand}` : ''}`}
                style={{ left: `${key.left}%` }}
                title={key.note}
              >
                {cue?.finger !== undefined && <strong className="key-finger black">{cue.finger}</strong>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
