import type { DetectedKey } from '../../lib/theory/keyDetection';

interface KeySignatureBadgeProps {
  detectedKey: DetectedKey;
}

// Treble clef staff: step 0 = E4 (bottom line), step increments by 1 per scale degree up.
// Staff lines at steps 0, 2, 4, 6, 8.
// Sharp order positions (steps): F5=8, C5=5, G5=9, D5=6, A4=3, E5=7, B4=4
// Flat order positions (steps): B4=4, E5=7, A4=3, D5=6, G4=2, C5=5, F4=1
const SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
const FLAT_STEPS  = [4, 7, 3, 6, 2, 5, 1];

const STAFF_LINE_SPACING = 7; // px between staff lines
const STAFF_BOTTOM_Y = 36;    // y of bottom staff line (E4)

function stepToY(step: number): number {
  return STAFF_BOTTOM_Y - step * (STAFF_LINE_SPACING / 2);
}

function KeyStaff({ detectedKey }: { detectedKey: DetectedKey }) {
  const count = Math.min(detectedKey.sharps || detectedKey.flats, 7);
  const steps = detectedKey.sharps > 0 ? SHARP_STEPS : FLAT_STEPS;
  const symbol = detectedKey.sharps > 0 ? '♯' : '♭';
  const staffLineYs = [0, 2, 4, 6, 8].map(stepToY);
  const staffLeft = 18;
  const staffRight = 74;
  const accidentalXStart = staffLeft + 4;
  const accidentalSpacing = 9;
  const svgWidth = staffLeft + 6 + count * accidentalSpacing + 14;

  if (count === 0) {
    return (
      <svg
        className="key-staff-svg"
        width={staffRight - staffLeft + 8}
        height={44}
        viewBox={`0 0 ${staffRight - staffLeft + 8} 44`}
        aria-hidden="true"
      >
        {staffLineYs.map((y) => (
          <line key={y} x1={2} y1={y} x2={staffRight - staffLeft + 4} y2={y} stroke="currentColor" strokeWidth={1} opacity={0.4}/>
        ))}
        <text x={4} y={32} fontSize={8} fill="currentColor" opacity={0.55} fontFamily="sans-serif">C</text>
      </svg>
    );
  }

  return (
    <svg
      className="key-staff-svg"
      width={svgWidth}
      height={44}
      viewBox={`0 0 ${svgWidth} 44`}
      aria-hidden="true"
    >
      {/* Treble clef glyph */}
      <text x={2} y={36} fontSize={26} fontFamily="serif" fill="currentColor" opacity={0.45} aria-hidden="true">𝄞</text>
      {/* Staff lines */}
      {staffLineYs.map((y) => (
        <line key={y} x1={staffLeft} y1={y} x2={svgWidth - 4} y2={y} stroke="currentColor" strokeWidth={1} opacity={0.4}/>
      ))}
      {/* Accidentals */}
      {steps.slice(0, count).map((step, i) => (
        <text
          key={i}
          x={accidentalXStart + i * accidentalSpacing}
          y={stepToY(step) + 4}
          fontSize={10}
          fill="currentColor"
          opacity={0.75}
          fontFamily="serif"
        >
          {symbol}
        </text>
      ))}
    </svg>
  );
}

export function KeySignatureBadge({ detectedKey }: KeySignatureBadgeProps) {
  const detail = detectedKey.sharps > 0
    ? `${detectedKey.sharps} sharp${detectedKey.sharps === 1 ? '' : 's'}: ${detectedKey.accidentalNames.join(', ')}`
    : detectedKey.flats > 0
      ? `${detectedKey.flats} flat${detectedKey.flats === 1 ? '' : 's'}: ${detectedKey.accidentalNames.join(', ')}`
      : 'No accidentals';

  return (
    <div className="key-signature-badge" title={`${detectedKey.keyName} - ${detail}`}>
      <strong>{detectedKey.keyName}</strong>
      <KeyStaff detectedKey={detectedKey} />
    </div>
  );
}
