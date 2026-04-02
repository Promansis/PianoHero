import { describe, expect, it } from 'vitest';
import { detectChord } from './chords';

describe('chords', () => {
  it('detects a major triad', () => {
    expect(detectChord([60, 64, 67])).toMatchObject({
      root: 0,
      rootName: 'C',
      quality: 'maj',
      label: 'Cmaj',
    });
  });

  it('prefers the bass note as root when multiple interpretations exist', () => {
    expect(detectChord([59, 62, 65, 68]))?.toMatchObject({
      rootName: 'B',
      quality: 'dim7',
    });
  });

  it('returns null when fewer than three distinct notes are provided', () => {
    expect(detectChord([60, 72])).toBeNull();
  });
});
