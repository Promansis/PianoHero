import { beforeEach, describe, expect, it } from 'vitest';
import { ScoringEngine } from './ScoringEngine';

describe('ScoringEngine', () => {
  describe('judgeTiming', () => {
    let engine: ScoringEngine;

    beforeEach(() => {
      engine = new ScoringEngine(10);
    });

    it('returns perfect through the 25ms boundary', () => {
      expect(engine.judgeTiming(0.024)).toBe('perfect');
      expect(engine.judgeTiming(-0.024)).toBe('perfect');
      expect(engine.judgeTiming(0.025)).toBe('perfect');
    });

    it('returns good immediately after 25ms and through 50ms', () => {
      expect(engine.judgeTiming(0.026)).toBe('good');
      expect(engine.judgeTiming(-0.026)).toBe('good');
      expect(engine.judgeTiming(0.05)).toBe('good');
    });

    it('returns ok immediately after 50ms and through 100ms', () => {
      expect(engine.judgeTiming(0.051)).toBe('ok');
      expect(engine.judgeTiming(-0.051)).toBe('ok');
      expect(engine.judgeTiming(0.1)).toBe('ok');
    });

    it('returns miss outside the 100ms hit window', () => {
      expect(engine.judgeTiming(0.101)).toBe('miss');
      expect(engine.judgeTiming(-0.101)).toBe('miss');
    });
  });

  describe('combo multiplier', () => {
    it('starts at 1.0x', () => {
      const engine = new ScoringEngine(100);
      expect(engine.getComboMultiplier()).toBe(1.0);
    });

    it('reaches 1.1x after 10 hits', () => {
      const engine = new ScoringEngine(100);
      for (let index = 0; index < 10; index += 1) {
        engine.recordHit('perfect', 0);
      }
      expect(engine.getComboMultiplier()).toBe(1.1);
    });

    it('caps at 3.0x', () => {
      const engine = new ScoringEngine(400);
      for (let index = 0; index < 400; index += 1) {
        engine.recordHit('perfect', 0);
      }
      expect(engine.getComboMultiplier()).toBe(3.0);
    });

    it('resets after a miss', () => {
      const engine = new ScoringEngine(100);
      for (let index = 0; index < 20; index += 1) {
        engine.recordHit('perfect', 0);
      }
      engine.recordMiss(0);
      expect(engine.getComboMultiplier()).toBe(1.0);
    });
  });

  describe('accuracy calculation', () => {
    it('is 100 when nothing has been judged', () => {
      const engine = new ScoringEngine(8);
      expect(engine.getSnapshot().accuracy).toBe(100);
    });

    it('weights perfect, good, ok, and miss scores correctly', () => {
      const engine = new ScoringEngine(4);
      engine.recordHit('perfect', 0);
      engine.recordHit('good', 0);
      engine.recordHit('ok', 1);
      engine.recordMiss(1);

      expect(engine.getSnapshot().accuracy).toBe(56.3);
    });
  });

  describe('final result', () => {
    it('returns the accumulated totals', () => {
      const engine = new ScoringEngine(3);
      engine.recordHit('perfect', 0);
      engine.recordHit('good', 0);
      engine.recordMiss(1);

      const result = engine.getFinalResult('song-abc', 'piano-hero', 1, 120);
      expect(result).toMatchObject({
        songId: 'song-abc',
        score: 175,
        accuracy: 58.3,
        maxCombo: 2,
        perfectHits: 1,
        goodHits: 1,
        okHits: 0,
        misses: 1,
        tempo: 1,
        mode: 'piano-hero',
        durationSec: 120,
      });
      expect(result.measureAccuracy).toEqual([
        { measure: 0, accuracy: 100 },
        { measure: 1, accuracy: 0 },
      ]);
    });
  });
});
