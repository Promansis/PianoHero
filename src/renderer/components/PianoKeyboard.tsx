import type { Hand } from '../../lib/game/types';
import { BLACK_KEY_WIDTH, buildKeyRangeLayout, KEY_LAYOUT, WHITE_KEY_WIDTH } from '../../lib/piano/pianoLayout';

export type NotePriority = 'next' | 'soon' | 'other';

interface PianoKeyboardProps {
  activeNotes: number[];
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number; priority?: NotePriority }>;
  highlightedNotes?: number[];
  highlightColor?: 'scale' | 'chord';
  chordLabel?: string | null;
  size?: 'small' | 'medium' | 'large';
  keyLabels?: Partial<Record<number, string>>;
  heading?: string;
  copy?: string;
  minMidi?: number;
  maxMidi?: number;
}

function upcomingMap(
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number; priority?: NotePriority }>,
): Map<number, { hand: Hand; finger?: number; priority?: NotePriority }> {
  return new Map(upcomingNotes.map((note) => [note.midi, { hand: note.hand, finger: note.finger, priority: note.priority }]));
}

function matchesHighlight(midi: number, highlightedNotes: number[]): boolean {
  return highlightedNotes.some((note) => (note <= 11 ? midi % 12 === note : midi === note));
}

export function PianoKeyboard({
  activeNotes,
  upcomingNotes,
  highlightedNotes = [],
  highlightColor = 'scale',
  chordLabel = null,
  size = 'medium',
  keyLabels = {},
  heading = 'Live + upcoming notes',
  copy = 'Blue cues the left hand. Orange cues the right.',
  minMidi,
  maxMidi,
}: PianoKeyboardProps) {
  const activeSet = new Set(activeNotes);
  const upcoming = upcomingMap(upcomingNotes);
  const layout =
    typeof minMidi === 'number' && typeof maxMidi === 'number' ? buildKeyRangeLayout(minMidi, maxMidi) : KEY_LAYOUT;
  const whiteKeys = layout.filter((key) => !key.isBlack);
  const blackKeys = layout.filter((key) => key.isBlack);
  const whiteKeyWidth = 100 / whiteKeys.length;

  return (
    <section className={`keyboard-shell panel keyboard-size-${size}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Keyboard</p>
          <h2>{heading}</h2>
        </div>
        <p className="panel-copy">{copy}</p>
      </div>

      <div className="keyboard-stage">
        {chordLabel && <div className="chord-label">{chordLabel}</div>}
        <div className="white-keys">
          {whiteKeys.map((key) => {
            const cue = upcoming.get(key.midi);
            const isActive = activeSet.has(key.midi);
            const isHighlighted = matchesHighlight(key.midi, highlightedNotes);
            return (
              <div
                key={key.midi}
                className={`white-key ${isActive ? 'active' : ''} ${cue ? `cue-${cue.priority ?? cue.hand}` : ''} ${isHighlighted ? `${highlightColor}-highlight` : ''}`}
                style={{ width: `${whiteKeyWidth}%` }}
                title={key.note}
              >
                <span className={`key-caption${keyLabels[key.midi] ? ' custom' : ''}`}>
                  {keyLabels[key.midi] ?? (key.note.startsWith('C') ? key.note : '')}
                </span>
                {cue?.finger !== undefined && (
                  <strong className={`key-finger${cue.priority ? ` finger-${cue.priority}` : ''}`}>{cue.finger}</strong>
                )}
              </div>
            );
          })}
        </div>

        <div className="black-keys">
          {blackKeys.map((key) => {
            const cue = upcoming.get(key.midi);
            const isActive = activeSet.has(key.midi);
            const isHighlighted = matchesHighlight(key.midi, highlightedNotes);
            return (
              <div
                key={key.midi}
                className={`black-key ${isActive ? 'active' : ''} ${cue ? `cue-${cue.priority ?? cue.hand}` : ''} ${isHighlighted ? `${highlightColor}-highlight` : ''}`}
                style={{ left: `${key.left}%`, width: `${whiteKeyWidth * BLACK_KEY_WIDTH}%` }}
                title={key.note}
              >
                {keyLabels[key.midi] && <span className="key-caption black">{keyLabels[key.midi]}</span>}
                {cue?.finger !== undefined && (
                  <strong className={`key-finger black${cue.priority ? ` finger-${cue.priority}` : ''}`}>{cue.finger}</strong>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
