import type { DetectedKey } from '../../lib/theory/keyDetection';

interface KeySignatureBadgeProps {
  detectedKey: DetectedKey;
}

function formatAccidentals(detectedKey: DetectedKey): string {
  if (detectedKey.sharps > 0) {
    return `${'♯'.repeat(detectedKey.sharps)} ${detectedKey.accidentalNames.join(', ')}`;
  }
  if (detectedKey.flats > 0) {
    return `${'♭'.repeat(detectedKey.flats)} ${detectedKey.accidentalNames.join(', ')}`;
  }
  return 'No sharps or flats';
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
      <span>{formatAccidentals(detectedKey)}</span>
    </div>
  );
}
