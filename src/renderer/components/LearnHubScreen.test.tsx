import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_LEARNING_PROGRESS } from '../../lib/learning/learningProgress';
import type { LearningProgress, LearningTier } from '../../lib/learning/types';
import { LearnHubScreen } from './LearnHubScreen';

describe('LearnHubScreen', () => {
  it('shows lesson step progress and tier progress counts inline', () => {
    const tiers: LearningTier[] = [
      {
        id: 'novice',
        order: 1,
        title: 'Novice Foundations',
        summary: 'Posture, note names, and the first guided drills.',
        lessons: [
          {
            id: 'novice-01',
            tier: 'novice',
            order: 1,
            title: 'Keyboard Geography',
            summary: 'Map the keys before you play.',
            estMinutes: 8,
            steps: [
              { kind: 'tip', title: 'Locate C', body: 'Find middle C.' },
              { kind: 'tip', title: 'White keys', body: 'Notice the two and three key groups.' },
            ],
          },
          {
            id: 'novice-02',
            tier: 'novice',
            order: 2,
            title: 'Finger Numbers',
            summary: 'Match numbers to each finger.',
            estMinutes: 10,
            steps: [
              { kind: 'tip', title: 'Thumbs', body: 'Thumb is finger one.' },
              { kind: 'tip', title: 'Pinky', body: 'Pinky is finger five.' },
            ],
          },
        ],
      },
    ];
    const progress: LearningProgress = {
      ...EMPTY_LEARNING_PROGRESS,
      completedLessons: ['novice-02'],
      completedSteps: {
        'novice-01': [0],
      },
      gatingEnabled: true,
    };

    render(
      <LearnHubScreen
        tiers={tiers}
        progress={progress}
        onOpenLesson={vi.fn()}
        onToggleGating={vi.fn()}
        onStartCapstone={vi.fn()}
      />,
    );

    expect(screen.getByText('1 / 2 steps')).toBeInTheDocument();
    expect(screen.getByLabelText('1 of 2 steps completed')).toBeInTheDocument();
    expect(screen.getByLabelText('1 of 2 lessons complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Sequential unlock')).toBeInTheDocument();
  });
});
