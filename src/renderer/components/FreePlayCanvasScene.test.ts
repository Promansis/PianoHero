import { describe, expect, it } from 'vitest';
import {
  auroraPhaseDirection,
  bubbleRadiusForNote,
  bubbleRiseVelocityForNote,
  bubbleSwayAmplitudeForNote,
  fireworkParticleLifetimeMs,
  geometrySidesForMidi,
  getEffectProfile,
  nextGalaxySupernova,
} from './FreePlayCanvasScene';
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

describe('phase 5 visual helpers', () => {
  it('maps sacred-geometry sides from C=12 down to B=1', () => {
    expect(geometrySidesForMidi(60)).toBe(12);
    expect(geometrySidesForMidi(61)).toBe(11);
    expect(geometrySidesForMidi(71)).toBe(1);
  });

  it('uses the planned firework particle lifetime formula', () => {
    expect(fireworkParticleLifetimeMs(0)).toBe(1600);
    expect(fireworkParticleLifetimeMs(1)).toBe(2400);
  });

  it('uses note-dependent bubble radius, rise, and sway formulas', () => {
    expect(bubbleRadiusForNote(36, 0.9)).toBeGreaterThan(bubbleRadiusForNote(84, 0.2));
    expect(Math.abs(bubbleRiseVelocityForNote(36, 0.9))).toBeGreaterThan(Math.abs(bubbleRiseVelocityForNote(84, 0.2)));
    expect(bubbleSwayAmplitudeForNote(72, 0.8)).toBeGreaterThan(bubbleSwayAmplitudeForNote(48, 0.2));
  });

  it('advances aurora phase by pitch direction', () => {
    expect(auroraPhaseDirection(72, 60)).toBe(1);
    expect(auroraPhaseDirection(55, 60)).toBe(-1);
  });

  it('uses the specified 0.94 supernova decay while a sustained chord is active', () => {
    const decayed = nextGalaxySupernova(1, 16.6667, true);
    expect(decayed).toBeCloseTo(0.94, 2);
    expect(nextGalaxySupernova(decayed, 16.6667, false)).toBeLessThan(decayed);
  });
});
