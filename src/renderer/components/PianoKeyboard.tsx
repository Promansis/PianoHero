import type { Hand } from '../../lib/game/types';
import { BLACK_KEY_WIDTH, KEY_LAYOUT, WHITE_KEY_WIDTH } from '../../lib/piano/pianoLayout';

export type NotePriority = 'next' | 'soon' | 'other';

interface PianoKeyboardProps {
  activeNotes: number[];
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number; priority?: NotePriority }>;
  highlightedNotes?: number[];
  highlightColor?: 'scale' | 'chord';
  chordLabel?: string | null;
  size?: 'small' | 'medium' | 'large';
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
}: PianoKeyboardProps) {
  const activeSet = new Set(activeNotes);
  const upcoming = upcomingMap(upcomingNotes);
  const whiteKeys = KEY_LAYOUT.filter((key) => !key.isBlack);
  const blackKeys = KEY_LAYOUT.filter((key) => key.isBlack);

  return (
    <section className={`keyboard-shell panel keyboard-size-${size}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Keyboard</p>
          <h2>Live + upcoming notes</h2>
        </div>
        <p className="panel-copy">Blue cues the left hand. Orange cues the right.</p>
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
                style={{ width: `${WHITE_KEY_WIDTH}%` }}
                title={key.note}
              >
                <span>{key.note.startsWith('C') ? key.note : ''}</span>
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
                style={{ left: `${key.left}%`, width: `${WHITE_KEY_WIDTH * BLACK_KEY_WIDTH}%` }}
                title={key.note}
              >
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
