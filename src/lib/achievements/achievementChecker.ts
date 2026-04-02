export interface AchievementMetrics {
  completedSongSessions: number;
  hasPerfectScore: boolean;
  currentStreak: number;
  theorySessionCount: number;
  masteredSongCount: number;
}

export function getUnlockableAchievementIds(
  metrics: AchievementMetrics,
  unlockedIds: Set<string>,
): string[] {
  const unlockable: string[] = [];

  const addIfLocked = (achievementId: string, condition: boolean) => {
    if (condition && !unlockedIds.has(achievementId)) {
      unlockable.push(achievementId);
    }
  };

  addIfLocked('first-song', metrics.completedSongSessions >= 1);
  addIfLocked('perfect-score', metrics.hasPerfectScore);
  addIfLocked('streak-7', metrics.currentStreak >= 7);
  addIfLocked('streak-30', metrics.currentStreak >= 30);
  addIfLocked('century-club', metrics.completedSongSessions >= 100);
  addIfLocked('theorist', metrics.theorySessionCount >= 10);
  addIfLocked('master-10', metrics.masteredSongCount >= 10);

  return unlockable;
}
