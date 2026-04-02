import { describe, expect, it } from 'vitest';
import { EASY_INTERVALS, getCompoundInterval, getInterval } from './intervals';

describe('intervals', () => {
  it('detects octave and simple intervals', () => {
    expect(getInterval(60, 67)).toMatchObject({ name: 'P5', semitones: 7 });
    expect(getInterval(60, 72)).toMatchObject({ name: 'P8', semitones: 12 });
  });

  it('builds compound intervals', () => {
    expect(getCompoundInterval(14)).toMatchObject({ name: 'M2', label: 'Major 9th', compound: true });
  });

  it('exposes easy interval subset', () => {
    expect(EASY_INTERVALS.map((interval) => interval.name)).toEqual(['P1', 'm3', 'M3', 'P4', 'P5', 'P8']);
  });
});
