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
    icon: '\u266a',
  },
  {
    id: 'perfect-score',
    name: 'Perfectionist',
    description: 'Reach 100% accuracy on any song.',
    icon: '\u2605',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day practice streak.',
    icon: '\u{1f525}',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day practice streak.',
    icon: '\u{1f3c6}',
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Complete 100 song sessions.',
    icon: '\u{1f4af}',
  },
  {
    id: 'theorist',
    name: 'Music Theorist',
    description: 'Complete 10 theory sessions.',
    icon: '\u{1f4da}',
  },
  {
    id: 'master-10',
    name: 'Master',
    description: 'Reach 90%+ accuracy on 10 songs.',
    icon: '\u{1f947}',
  },
];
