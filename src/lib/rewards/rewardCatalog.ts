import type { AchievementRow } from '../../shared/dbTypes';

export type RewardType = 'instrument' | 'palette' | 'theme' | 'title' | 'audio-control' | 'results-effect';

export interface RewardDefinition {
  id: string;
  type: RewardType;
  displayName: string;
  description: string;
  grantedByAchievementId: string;
}

export const REWARD_CATALOG: RewardDefinition[] = [
  {
    id: 'instrument:warm-pad',
    type: 'instrument',
    displayName: 'Warm Pad',
    description: 'Unlocked by completing your first song.',
    grantedByAchievementId: 'first-song',
  },
  {
    id: 'palette:aurora-emerald',
    type: 'palette',
    displayName: 'Aurora Emerald',
    description: 'Unlocked by reaching 100% accuracy.',
    grantedByAchievementId: 'perfect-score',
  },
  {
    id: 'instrument:honky-tonk',
    type: 'instrument',
    displayName: 'Honky-Tonk',
    description: 'Unlocked by a 7-day practice streak.',
    grantedByAchievementId: 'streak-7',
  },
  {
    id: 'theme:neon',
    type: 'theme',
    displayName: 'Neon theme',
    description: 'Unlocked by a 30-day practice streak.',
    grantedByAchievementId: 'streak-30',
  },
  {
    id: 'palette:constellation-galactic',
    type: 'palette',
    displayName: 'Constellation Galactic',
    description: 'Unlocked by completing 100 song sessions.',
    grantedByAchievementId: 'century-club',
  },
  {
    id: 'audio:pitch-bend',
    type: 'audio-control',
    displayName: 'Pitch Bend',
    description: 'Unlocked by completing 10 theory sessions.',
    grantedByAchievementId: 'theorist',
  },
  {
    id: 'audio:reverb-customization',
    type: 'audio-control',
    displayName: 'Reverb Customization',
    description: 'Unlocked by completing 10 theory sessions.',
    grantedByAchievementId: 'theorist',
  },
  {
    id: 'effect:maestro-confetti',
    type: 'results-effect',
    displayName: 'Maestro Confetti',
    description: 'Unlocked by reaching 90%+ on 10 songs.',
    grantedByAchievementId: 'master-10',
  },
  {
    id: 'title:maestro',
    type: 'title',
    displayName: 'Maestro',
    description: 'Unlocked by reaching 90%+ on 10 songs.',
    grantedByAchievementId: 'master-10',
  },
];

export function getUnlockedRewardIds(achievements: AchievementRow[]): Set<string> {
  const unlockedAchievementIds = new Set(
    achievements.filter((a) => a.unlockedAt !== null).map((a) => a.id),
  );
  const result = new Set<string>();
  for (const reward of REWARD_CATALOG) {
    if (unlockedAchievementIds.has(reward.grantedByAchievementId)) {
      result.add(reward.id);
    }
  }
  return result;
}

export function isRewardUnlocked(rewardId: string, unlockedRewardIds: Set<string>): boolean {
  const requiresReward = REWARD_CATALOG.some((r) => r.id === rewardId);
  if (!requiresReward) return true;
  return unlockedRewardIds.has(rewardId);
}

export function getRewardDefinition(rewardId: string): RewardDefinition | undefined {
  return REWARD_CATALOG.find((reward) => reward.id === rewardId);
}
