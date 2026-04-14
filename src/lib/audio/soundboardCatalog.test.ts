import { describe, expect, it } from 'vitest';
import { SOUNDBOARD_CLIPS, SOUNDBOARD_MAX_MIDI, SOUNDBOARD_MIN_MIDI } from './soundboardCatalog';

describe('soundboardCatalog', () => {
  it('maps a contiguous piano note range for the kids soundboard', () => {
    expect(SOUNDBOARD_CLIPS).toHaveLength(61);
    expect(SOUNDBOARD_MAX_MIDI - SOUNDBOARD_MIN_MIDI + 1).toBe(61);
    expect(SOUNDBOARD_CLIPS.map((clip) => clip.midi)).toEqual(
      Array.from({ length: 61 }, (_value, index) => SOUNDBOARD_MIN_MIDI + index),
    );
  });

  it('keeps all clip sources inside the bundled soundboard directory', () => {
    SOUNDBOARD_CLIPS.forEach((clip) => {
      expect(clip.src.startsWith('/soundboard/')).toBe(true);
      expect(clip.source).toBe('Philharmonia Orchestra Sound Samples');
      expect(clip.shortLabel.length).toBeGreaterThan(0);
    });
  });
});
