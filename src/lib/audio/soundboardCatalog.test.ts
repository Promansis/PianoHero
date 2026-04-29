import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

  it('keeps all classic clips short, bundled, and visually labeled', () => {
    expect(new Set(SOUNDBOARD_CLIPS.map((clip) => clip.id)).size).toBe(SOUNDBOARD_CLIPS.length);
    expect(new Set(SOUNDBOARD_CLIPS.map((clip) => clip.src)).size).toBe(SOUNDBOARD_CLIPS.length);
    expect(new Set(SOUNDBOARD_CLIPS.map((clip) => clip.emoji)).size).toBe(SOUNDBOARD_CLIPS.length);

    SOUNDBOARD_CLIPS.forEach((clip) => {
      expect(clip.src.startsWith('/soundboard/classic/')).toBe(true);
      expect(clip.src.endsWith('.ogg')).toBe(true);
      expect(clip.source).toBe('Mixkit Sound Effects');
      expect(clip.emoji).toBeTruthy();
      expect(clip.license).toBe('Mixkit Free License');
      expect(clip.shortLabel.length).toBeGreaterThan(0);
      expect(existsSync(join(process.cwd(), 'public', clip.src.replace(/^\//, '')))).toBe(true);
    });
    expect(new Set(SOUNDBOARD_CLIPS.map((clip) => clip.category))).toEqual(
      new Set(['toy', 'voice', 'music', 'pet', 'impact', 'object', 'vehicle', 'alert', 'weather']),
    );
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

    expect(classicClip?.label).toBe('Toy Whistle');
    expect(animalClip?.label).toBe('Dog');
  });
});
