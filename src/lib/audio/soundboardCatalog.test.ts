import { describe, expect, it } from 'vitest';
import { SOUNDBOARD_CLIPS } from './soundboardCatalog';

describe('soundboardCatalog', () => {
  it('maps a contiguous piano note range for the kids soundboard', () => {
    expect(SOUNDBOARD_CLIPS).toHaveLength(16);
    expect(SOUNDBOARD_CLIPS.map((clip) => clip.midi)).toEqual([
      60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
    ]);
  });

  it('keeps all clip sources inside the bundled soundboard directory', () => {
    SOUNDBOARD_CLIPS.forEach((clip) => {
      expect(clip.src.startsWith('/soundboard/')).toBe(true);
      expect(clip.source).toBe('Philharmonia Orchestra Sound Samples');
      expect(clip.shortLabel.length).toBeGreaterThan(0);
    });
  });
});
