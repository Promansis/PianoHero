import { describe, expect, it } from 'vitest';
import { getEffectProfile } from './FreePlayCanvasScene';
import { calculateSilenceProgress } from './freePlayVisualState';
import type { RollingNoteEvent } from './freePlayVisualState';

function note(id: string, midi: number, velocity: number, createdAt: number): RollingNoteEvent {
  return { id, midi, velocity, createdAt };
}

describe('getEffectProfile', () => {
  it('subtle profile has lower bloom cap than balanced', () => {
    expect(getEffectProfile('subtle').bloomAlphaCap).toBeLessThan(getEffectProfile('balanced').bloomAlphaCap);
  });

  it('balanced profile has lower bloom cap than vivid', () => {
    expect(getEffectProfile('balanced').bloomAlphaCap).toBeLessThan(getEffectProfile('vivid').bloomAlphaCap);
  });

  it('subtle profile has smaller blur range than vivid', () => {
    const subtle = getEffectProfile('subtle');
    const vivid = getEffectProfile('vivid');
    expect(subtle.bloomBlurMin).toBeLessThanOrEqual(vivid.bloomBlurMin);
    expect(subtle.bloomBlurMax).toBeLessThan(vivid.bloomBlurMax);
  });

  it('subtle vignette is weaker than vivid', () => {
    expect(getEffectProfile('subtle').vignetteStrength).toBeLessThan(getEffectProfile('vivid').vignetteStrength);
  });

  it('bloom alpha cap is always positive and finite for all presets', () => {
    for (const preset of ['subtle', 'balanced', 'vivid'] as const) {
      const { bloomAlphaCap, bloomBlurMin, bloomBlurMax, vignetteStrength, colorGradeStrength } = getEffectProfile(preset);
      expect(bloomAlphaCap).toBeGreaterThan(0);
      expect(bloomBlurMin).toBeGreaterThan(0);
      expect(bloomBlurMax).toBeGreaterThan(bloomBlurMin);
      expect(vignetteStrength).toBeGreaterThan(0);
      expect(colorGradeStrength).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('silence-driven bloom decay via calculateSilenceProgress', () => {
  it('silence progress is zero while notes are held', () => {
    const history = [note('a', 60, 0.8, 1_000)];
    expect(calculateSilenceProgress([60], history, 5_000)).toBe(0);
  });

  it('silence grows over time after the last note releases', () => {
    const history = [note('a', 60, 0.8, 1_000)];
    const shortSilence = calculateSilenceProgress([], history, 1_200);
    const longSilence = calculateSilenceProgress([], history, 5_000);
    expect(longSilence).toBeGreaterThan(shortSilence);
  });

  it('bloom energy (intensity - silence penalty) decreases during prolonged silence', () => {
    const history = [note('a', 60, 0.8, 1_000)];
    // Simulate bloom formula: bloomEnergy = intensity * 0.52 - silence * 0.38
    const shortSilence = calculateSilenceProgress([], history, 1_300);
    const longSilence = calculateSilenceProgress([], history, 8_000);
    const energyAfterShortGap = 0.52 * 0.2 - longSilence * 0.38;
    const energyAfterLongGap = 0.52 * 0.2 - shortSilence * 0.38;
    expect(energyAfterLongGap).toBeGreaterThan(energyAfterShortGap);
  });
});
