import { describe, expect, it } from 'vitest';
import type { AchievementRow } from '../../shared/dbTypes';
import { REWARD_CATALOG, getUnlockedRewardIds, isRewardUnlocked } from './rewardCatalog';

function makeAchievement(id: string, unlocked: boolean): AchievementRow {
  return {
    id,
    unlockedAt: unlocked ? '2026-01-01T00:00:00.000Z' : null,
  };
}

describe('rewardCatalog', () => {
  it('grants rewards only for unlocked achievements', () => {
    const achievements: AchievementRow[] = [
      makeAchievement('first-song', true),
      makeAchievement('perfect-score', false),
      makeAchievement('streak-7', true),
    ];
    const unlocked = getUnlockedRewardIds(achievements);
    expect(unlocked.has('instrument:warm-pad')).toBe(true);
    expect(unlocked.has('instrument:honky-tonk')).toBe(true);
    expect(unlocked.has('palette:aurora-emerald')).toBe(false);
  });

  it('unlocks both rewards tied to a single achievement', () => {
    const achievements: AchievementRow[] = [makeAchievement('master-10', true)];
    const unlocked = getUnlockedRewardIds(achievements);
    expect(unlocked.has('title:maestro')).toBe(true);
    expect(unlocked.has('effect:maestro-confetti')).toBe(true);
  });

  it('returns empty set when no achievements unlocked', () => {
    const unlocked = getUnlockedRewardIds([]);
    expect(unlocked.size).toBe(0);
  });

  it('isRewardUnlocked returns true for unknown reward ids (no gating)', () => {
    expect(isRewardUnlocked('unknown-reward-id', new Set())).toBe(true);
  });

  it('isRewardUnlocked respects the unlocked set for known rewards', () => {
    const set = new Set<string>(['instrument:warm-pad']);
    expect(isRewardUnlocked('instrument:warm-pad', set)).toBe(true);
    expect(isRewardUnlocked('instrument:honky-tonk', set)).toBe(false);
  });

  it('grants pitch-bend customization from the theorist achievement', () => {
    const achievements: AchievementRow[] = [makeAchievement('theorist', true)];
    const unlocked = getUnlockedRewardIds(achievements);
    expect(unlocked.has('audio:pitch-bend')).toBe(true);
    expect(unlocked.has('audio:reverb-customization')).toBe(true);
  });

  it('grants palette rewards from the intended achievements', () => {
    const achievements: AchievementRow[] = [
      makeAchievement('perfect-score', true),
      makeAchievement('century-club', true),
    ];
    const unlocked = getUnlockedRewardIds(achievements);
    expect(unlocked.has('palette:aurora-emerald')).toBe(true);
    expect(unlocked.has('palette:constellation-galactic')).toBe(true);
  });

  it('each reward references an achievement id (catalog integrity)', () => {
    for (const reward of REWARD_CATALOG) {
      expect(reward.grantedByAchievementId.length).toBeGreaterThan(0);
      expect(reward.id).toMatch(/^[a-z-]+:[a-z0-9-]+$/);
    }
  });
});
