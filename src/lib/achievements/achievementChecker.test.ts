import { describe, expect, it } from 'vitest';
import { getUnlockableAchievementIds } from './achievementChecker';

describe('getUnlockableAchievementIds', () => {
  it('returns every newly met achievement threshold', () => {
    const unlocked = new Set(['first-song']);
    const result = getUnlockableAchievementIds(
      {
        completedSongSessions: 100,
        hasPerfectScore: true,
        currentStreak: 30,
        theorySessionCount: 10,
        masteredSongCount: 12,
      },
      unlocked,
    );

    expect(result).toEqual([
      'perfect-score',
      'streak-7',
      'streak-30',
      'century-club',
      'theorist',
      'master-10',
    ]);
  });

  it('returns an empty list when nothing new is unlockable', () => {
    const result = getUnlockableAchievementIds(
      {
        completedSongSessions: 0,
        hasPerfectScore: false,
        currentStreak: 2,
        theorySessionCount: 1,
        masteredSongCount: 0,
      },
      new Set(),
    );

    expect(result).toEqual([]);
  });
});
