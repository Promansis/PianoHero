import { describe, expect, it } from 'vitest';
import {
  calculatePracticeStreak,
  resolveStreakFreezeConsumption,
  shouldAwardStreakFreezeForMilestone,
} from './database';

function buildPracticeDates(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const [year, month, day] = startDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (let day = 0; day < days; day += 1) {
    dates.push([
      cursor.getUTCFullYear(),
      String(cursor.getUTCMonth() + 1).padStart(2, '0'),
      String(cursor.getUTCDate()).padStart(2, '0'),
    ].join('-'));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

describe('database streak freeze helpers', () => {
  it('earns one streak freeze at a 14 day milestone', () => {
    const currentStreak = calculatePracticeStreak(
      buildPracticeDates('2026-01-01', 14),
      new Date('2026-01-14T12:00:00.000Z'),
    ).currentStreak;

    expect(currentStreak).toBe(14);
    expect(shouldAwardStreakFreezeForMilestone(currentStreak)).toBe(true);
  });

  it('consumes a streak freeze for exactly one missed day', () => {
    const practiceDates = [...buildPracticeDates('2026-01-01', 14), '2026-01-16'];
    const consumption = resolveStreakFreezeConsumption(
      [...practiceDates].reverse(),
      new Date('2026-01-16T12:00:00.000Z'),
      1,
      [],
    );

    const streak = calculatePracticeStreak(
      practiceDates,
      new Date('2026-01-16T12:00:00.000Z'),
      consumption.usedDates,
    );

    expect(consumption.consumedDate).toBe('2026-01-15');
    expect(consumption.freezeCount).toBe(0);
    expect(streak.currentStreak).toBe(16);
  });

  it('does not consume a streak freeze for a gap larger than one missed day', () => {
    const practiceDates = [...buildPracticeDates('2026-01-01', 14), '2026-01-17'];
    const consumption = resolveStreakFreezeConsumption(
      [...practiceDates].reverse(),
      new Date('2026-01-17T12:00:00.000Z'),
      1,
      [],
    );

    const streak = calculatePracticeStreak(
      practiceDates,
      new Date('2026-01-17T12:00:00.000Z'),
      consumption.usedDates,
    );

    expect(consumption.consumedDate).toBeNull();
    expect(consumption.freezeCount).toBe(1);
    expect(streak.currentStreak).toBe(1);
  });
});
