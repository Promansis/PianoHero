import type { LearningProgress, LearningTier } from './types';

export function buildDeveloperUnlockedProgress(curriculum: LearningTier[]): LearningProgress {
  const completedLessons = curriculum
    .flatMap((tier) => tier.lessons)
    .filter((lesson) => !lesson.isStub)
    .map((lesson) => lesson.id);

  const completedSteps = Object.fromEntries(
    curriculum
      .flatMap((tier) => tier.lessons)
      .filter((lesson) => !lesson.isStub)
      .map((lesson) => [
        lesson.id,
        lesson.steps.map((_step, index) => index),
      ]),
  );

  const capstoneResults = Object.fromEntries(
    curriculum
      .filter((tier) => tier.capstone)
      .map((tier) => [tier.id, tier.capstone!.accuracyThreshold]),
  );

  return {
    completedLessons,
    completedSteps,
    gatingEnabled: false,
    capstoneResults,
  };
}
