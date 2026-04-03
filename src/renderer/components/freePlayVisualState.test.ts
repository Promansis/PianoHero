import { describe, expect, it } from 'vitest';
import {
  applyNoteToHeatmap,
  buildPitchClassHistogram,
  calculatePitchCenter,
  calculateVisualIntensity,
  coolHeatValues,
  detectKeyCenter,
  findPeakHeatZones,
  selectConstellationMotif,
  updateRepeatedNoteStats,
  type RollingNoteEvent,
} from './freePlayVisualState';

function note(id: string, midi: number, velocity: number, createdAt: number): RollingNoteEvent {
  return { id, midi, velocity, createdAt };
}

describe('freePlayVisualState', () => {
  it('calculates higher intensity for denser recent notes and active polyphony', () => {
    const now = 4_000;
    const sparse = [note('a', 60, 0.4, now - 1_700)];
    const dense = [
      note('a', 60, 0.9, now - 100),
      note('b', 64, 0.85, now - 180),
      note('c', 67, 0.82, now - 260),
    ];

    expect(calculateVisualIntensity(dense, [60, 64, 67], now)).toBeGreaterThan(calculateVisualIntensity(sparse, [60], now));
  });

  it('falls back to recent note history when no notes are actively held', () => {
    const now = 3_000;
    const center = calculatePitchCenter([], [note('a', 72, 0.9, now - 120), note('b', 76, 0.8, now - 180)], now);

    expect(center).toBeGreaterThan(72);
    expect(center).toBeLessThan(76.5);
  });

  it('detects a C major leaning key center from weighted note history', () => {
    const now = 10_000;
    const history = [
      note('a', 60, 0.9, now - 800),
      note('b', 64, 0.85, now - 700),
      note('c', 67, 0.88, now - 620),
      note('d', 72, 0.8, now - 540),
      note('e', 76, 0.76, now - 440),
    ];

    expect(detectKeyCenter(history, now).keyName).toBe('C Major');
    expect(buildPitchClassHistogram(history, now)[0]).toBeGreaterThan(0);
  });

  it('tracks repeated note streaks for orbit growth', () => {
    const first = updateRepeatedNoteStats(new Map(), note('a', 60, 0.7, 1_000));
    const second = updateRepeatedNoteStats(first, note('b', 60, 0.8, 2_200));
    const stat = second.get(60);

    expect(stat).toMatchObject({
      hits: 2,
      streak: 2,
    });
  });

  it('cools and accumulates granular heatmap values', () => {
    const heated = applyNoteToHeatmap(Array.from({ length: 88 }, () => 0), 60, 0.9);
    const cooled = coolHeatValues(heated, 1_000);

    expect(heated[39]).toBeGreaterThan(0);
    expect(cooled[39]).toBeLessThan(heated[39]);
    expect(findPeakHeatZones(heated)[0]?.startMidi).toBe(60);
  });

  it('selects deterministic constellation motifs from recent notes', () => {
    const history = [
      note('a', 60, 0.9, 100),
      note('b', 63, 0.8, 200),
      note('c', 67, 0.8, 300),
      note('d', 70, 0.75, 400),
    ];

    expect(selectConstellationMotif(history)).toMatchObject({
      id: expect.any(String),
      anchors: expect.any(Array),
    });
  });
});
