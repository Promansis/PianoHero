import { describe, expect, it } from 'vitest';
import { CURRICULUM } from './curriculum';
import { buildDeveloperUnlockedProgress } from './developerUnlocks';
import { isLessonCompleted, isLessonStepCompleted, isLessonUnlocked, isTierCapstoneCleared } from './learningProgress';

describe('buildDeveloperUnlockedProgress', () => {
  it('completes all published lessons, steps, and capstones while disabling gating', () => {
    const progress = buildDeveloperUnlockedProgress(CURRICULUM);

    expect(progress.gatingEnabled).toBe(false);

    for (const tier of CURRICULUM) {
      for (const lesson of tier.lessons) {
        expect(isLessonUnlocked(CURRICULUM, progress, lesson)).toBe(!lesson.isStub);

        if (lesson.isStub) {
          continue;
        }

        expect(isLessonCompleted(progress, lesson.id)).toBe(true);
        expect(progress.completedSteps[lesson.id]).toHaveLength(lesson.steps.length);

        for (const [stepIndex] of lesson.steps.entries()) {
          expect(isLessonStepCompleted(progress, lesson.id, stepIndex)).toBe(true);
        }
      }

      if (tier.capstone) {
        expect(isTierCapstoneCleared(progress, tier.id, tier.capstone.accuracyThreshold)).toBe(true);
      }
    }
  });
});
