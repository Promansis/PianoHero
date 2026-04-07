import type { CSSProperties } from 'react';
import { getKeyPosition, MAX_MIDI, MIN_MIDI } from '../../lib/piano/pianoLayout';
import type { DiagramSpec } from '../../lib/learning/types';
import { PianoKeyboard } from './PianoKeyboard';

interface LessonDiagramProps {
  diagram: DiagramSpec;
}

function FingerNumbersDiagram({ hand }: { hand: 'left' | 'right' }) {
  const numbers = hand === 'right' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];

  return (
    <div className="lesson-finger-diagram" aria-label={`${hand} hand finger numbers`}>
      {numbers.map((number, index) => (
        <div className="lesson-finger-pill" key={`${hand}-${number}`} style={{ '--finger-delay': `${index * 60}ms` } as CSSProperties}>
          <span>{number}</span>
          <strong>{`Finger ${number}`}</strong>
        </div>
      ))}
    </div>
  );
}

function SeatHeightDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      <rect x="72" y="38" width="58" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.45" />
      <line x1="82" y1="38" x2="82" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="92" y1="38" x2="92" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="102" y1="38" x2="102" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="112" y1="38" x2="112" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <rect x="12" y="66" width="52" height="5" rx="2" fill="currentColor" opacity="0.25" />
      <rect x="30" y="38" width="11" height="28" rx="4" fill="currentColor" opacity="0.4" />
      <circle cx="35" cy="29" r="9" fill="currentColor" opacity="0.4" />
      <line x1="30" y1="47" x2="72" y2="43" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.55" />
      <line x1="12" y1="43" x2="130" y2="43" stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.28" />
      <text x="12" y="84" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">forearms about parallel to the floor</text>
    </svg>
  );
}

function DistanceDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      <rect x="38" y="10" width="80" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.45" />
      <line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="63" y1="10" x2="63" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="76" y1="10" x2="76" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="89" y1="10" x2="89" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="102" y1="10" x2="102" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <ellipse cx="78" cy="66" rx="18" ry="14" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="78" cy="42" r="10" fill="currentColor" opacity="0.35" />
      <line x1="62" y1="60" x2="44" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <line x1="94" y1="60" x2="112" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <circle cx="53" cy="41" r="3.5" fill="currentColor" opacity="0.5" />
      <circle cx="103" cy="41" r="3.5" fill="currentColor" opacity="0.5" />
      <text x="20" y="86" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">elbows slightly in front of the torso</text>
    </svg>
  );
}

function PostureDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      <line x1="70" y1="78" x2="70" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <circle cx="70" cy="15" r="10" fill="currentColor" opacity="0.4" />
      <line x1="44" y1="32" x2="96" y2="32" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.5" />
      <rect x="60" y="32" width="20" height="32" rx="6" fill="currentColor" opacity="0.35" />
      <rect x="55" y="75" width="12" height="5" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="73" y="75" width="12" height="5" rx="2" fill="currentColor" opacity="0.3" />
      <path d="M90 14 L90 78" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.25" />
      <text x="16" y="86" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">tall back, relaxed shoulders</text>
    </svg>
  );
}

function HandShapeDiagram() {
  return (
    <svg className="setup-diagram-svg" viewBox="0 0 140 90" aria-hidden="true">
      <rect x="18" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <rect x="38" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <rect x="58" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <rect x="78" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <rect x="98" y="52" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M22 52 Q68 12 116 52" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <circle cx="27" cy="52" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="47" cy="52" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="67" cy="52" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="87" cy="52" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="107" cy="52" r="4" fill="currentColor" opacity="0.5" />
      <text x="20" y="87" fontSize="9.5" fill="currentColor" opacity="0.5" fontFamily="sans-serif">curved fingers, level wrist</text>
    </svg>
  );
}

function SetupDiagram({ variant }: { variant: 'seat-height' | 'distance' | 'posture' | 'hand-shape' }) {
  switch (variant) {
    case 'seat-height':
      return <SeatHeightDiagram />;
    case 'distance':
      return <DistanceDiagram />;
    case 'posture':
      return <PostureDiagram />;
    case 'hand-shape':
      return <HandShapeDiagram />;
  }
}

function KeyboardLabels({ labels }: { labels: Record<number, string> }) {
  return (
    <div className="lesson-keyboard-labels" aria-hidden="true">
      {Object.entries(labels).map(([midi, text]) => {
        const midiValue = Number(midi);
        if (!Number.isFinite(midiValue) || midiValue < MIN_MIDI || midiValue > MAX_MIDI) {
          return null;
        }
        const position = getKeyPosition(midiValue);
        return (
          <span
            key={midi}
            className="lesson-keyboard-label"
            style={{ left: `${position.leftPercent + position.widthPercent / 2}%` }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

export function LessonDiagram({ diagram }: LessonDiagramProps) {
  if (diagram.kind === 'keyboard-highlight') {
    return (
      <div className="lesson-diagram lesson-keyboard-diagram">
        <PianoKeyboard activeNotes={[]} upcomingNotes={[]} highlightedNotes={diagram.midiNotes} highlightColor="scale" size="small" />
        {diagram.labels ? <KeyboardLabels labels={diagram.labels} /> : null}
      </div>
    );
  }

  if (diagram.kind === 'finger-numbers') {
    return (
      <div className="lesson-diagram">
        <FingerNumbersDiagram hand={diagram.hand} />
      </div>
    );
  }

  if (diagram.kind === 'setup-diagram') {
    return (
      <div className="lesson-diagram lesson-setup-diagram">
        <SetupDiagram variant={diagram.variant} />
      </div>
    );
  }

  return (
    <div className="lesson-diagram lesson-image-diagram">
      <img src={diagram.src} alt={diagram.alt} />
    </div>
  );
}
