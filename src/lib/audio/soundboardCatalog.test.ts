import { describe, expect, it } from 'vitest';
import {
  SOUNDBOARD_CLIPS,
  SOUNDBOARD_MAX_MIDI,
  SOUNDBOARD_MIN_MIDI,
  SOUNDBOARD_MODES,
  getSoundboardClipForMidi,
} from './soundboardCatalog';

describe('soundboardCatalog', () => {
  it('maps a contiguous piano note range for every soundboard mode', () => {
    expect(SOUNDBOARD_MAX_MIDI - SOUNDBOARD_MIN_MIDI + 1).toBe(61);

    SOUNDBOARD_MODES.forEach((mode) => {
      expect(mode.clips).toHaveLength(61);
      expect(mode.clips.map((clip) => clip.midi)).toEqual(
        Array.from({ length: 61 }, (_value, index) => SOUNDBOARD_MIN_MIDI + index),
      );
    });
  });

  it('keeps all classic clip sources inside the bundled soundboard directory', () => {
    SOUNDBOARD_CLIPS.forEach((clip) => {
      expect(clip.src.startsWith('/soundboard/')).toBe(true);
      expect(clip.source).toBe('Philharmonia Orchestra Sound Samples');
      expect(clip.shortLabel.length).toBeGreaterThan(0);
    });
  });

  it('includes enriched metadata for animal clips', () => {
    const animalsMode = SOUNDBOARD_MODES.find((mode) => mode.id === 'animals');
    expect(animalsMode).toBeDefined();

    animalsMode!.clips.forEach((clip) => {
      expect(clip.src.startsWith('/soundboard/animals/')).toBe(true);
      expect(clip.visualSrc?.startsWith('/soundboard/animals-sprites/')).toBe(true);
      expect(clip.source.length).toBeGreaterThan(0);
      expect(clip.sourcePage).toBeTruthy();
      expect(clip.attribution).toBeTruthy();
    });
  });

  it('looks up clips by midi per mode', () => {
    const classicClip = getSoundboardClipForMidi('classic', SOUNDBOARD_MIN_MIDI);
    const animalClip = getSoundboardClipForMidi('animals', SOUNDBOARD_MIN_MIDI);

    expect(classicClip?.label).toBe('Bass Boom');
    expect(animalClip?.label).toBe('Dog');
  });
});
