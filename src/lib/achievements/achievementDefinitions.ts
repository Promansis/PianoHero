export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-song',
    name: 'First Steps',
    description: 'Complete your first song.',
    icon: '1',
  },
  {
    id: 'perfect-score',
    name: 'Perfectionist',
    description: 'Reach 100% accuracy on any song.',
    icon: '*',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day practice streak.',
    icon: '7',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day practice streak.',
    icon: '30',
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Complete 100 song sessions.',
    icon: '100',
  },
  {
    id: 'theorist',
    name: 'Music Theorist',
    description: 'Complete 10 theory sessions.',
    icon: '10',
  },
  {
    id: 'master-10',
    name: 'Master',
    description: 'Reach 90%+ accuracy on 10 songs.',
    icon: '10x',
  },
];
