import type { AppBridge } from '../../shared/ipc';
import type { Lesson, LearningProgress, LearningTier } from './types';

export const LEARNING_SETTINGS_CATEGORY = 'learning';
export const COMPLETED_LESSONS_KEY = 'completedLessons';
export const COMPLETED_STEPS_KEY = 'completedSteps';
export const GATING_ENABLED_KEY = 'gatingEnabled';

export const EMPTY_LEARNING_PROGRESS: LearningProgress = {
  completedLessons: [],
  completedSteps: {},
  gatingEnabled: false,
};

export type LearningSettingsBridge = Pick<AppBridge, 'getSetting' | 'setSetting'>;

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function loadLearningProgress(bridge?: LearningSettingsBridge | null): Promise<LearningProgress> {
  if (!bridge) {
    return EMPTY_LEARNING_PROGRESS;
  }

  const [completedLessonsRaw, completedStepsRaw, gatingEnabledRaw] = await Promise.all([
    bridge.getSetting(LEARNING_SETTINGS_CATEGORY, COMPLETED_LESSONS_KEY),
    bridge.getSetting(LEARNING_SETTINGS_CATEGORY, COMPLETED_STEPS_KEY),
    bridge.getSetting(LEARNING_SETTINGS_CATEGORY, GATING_ENABLED_KEY),
  ]);

  const completedLessons = parseJson<string[]>(completedLessonsRaw, []).filter((value) => typeof value === 'string');
  const completedStepsRecord = parseJson<Record<string, number[]>>(completedStepsRaw, {});
  const completedSteps = Object.fromEntries(
    Object.entries(completedStepsRecord).map(([lessonId, stepIndexes]) => [
      lessonId,
      stepIndexes.filter((index) => Number.isInteger(index)).sort((left, right) => left - right),
    ]),
  );

  return {
    completedLessons,
    completedSteps,
    gatingEnabled: gatingEnabledRaw === 'true',
  };
}

export async function saveLearningProgress(
  bridge: LearningSettingsBridge | null | undefined,
  progress: LearningProgress,
): Promise<void> {
  if (!bridge) {
    return;
  }

  await Promise.all([
    bridge.setSetting(LEARNING_SETTINGS_CATEGORY, COMPLETED_LESSONS_KEY, JSON.stringify(progress.completedLessons)),
    bridge.setSetting(LEARNING_SETTINGS_CATEGORY, COMPLETED_STEPS_KEY, JSON.stringify(progress.completedSteps)),
    bridge.setSetting(LEARNING_SETTINGS_CATEGORY, GATING_ENABLED_KEY, progress.gatingEnabled ? 'true' : 'false'),
  ]);
}

export function isLessonCompleted(progress: LearningProgress, lessonId: string): boolean {
  return progress.completedLessons.includes(lessonId);
}

export function isLessonStepCompleted(progress: LearningProgress, lessonId: string, stepIndex: number): boolean {
  return progress.completedSteps[lessonId]?.includes(stepIndex) ?? false;
}

export function markLessonStepCompleted(progress: LearningProgress, lessonId: string, stepIndex: number): LearningProgress {
  const existing = new Set(progress.completedSteps[lessonId] ?? []);
  existing.add(stepIndex);

  return {
    ...progress,
    completedSteps: {
      ...progress.completedSteps,
      [lessonId]: [...existing].sort((left, right) => left - right),
    },
  };
}

export function markLessonCompleted(progress: LearningProgress, lessonId: string): LearningProgress {
  if (progress.completedLessons.includes(lessonId)) {
    return progress;
  }

  return {
    ...progress,
    completedLessons: [...progress.completedLessons, lessonId],
  };
}

export function setLearningGating(progress: LearningProgress, gatingEnabled: boolean): LearningProgress {
  return {
    ...progress,
    gatingEnabled,
  };
}

export function getFirstIncompleteStepIndex(lesson: Lesson, progress: LearningProgress): number {
  const completed = new Set(progress.completedSteps[lesson.id] ?? []);
  const nextIndex = lesson.steps.findIndex((_step, index) => !completed.has(index));
  return nextIndex >= 0 ? nextIndex : Math.max(0, lesson.steps.length - 1);
}

export function isLessonUnlocked(curriculum: LearningTier[], progress: LearningProgress, lesson: Lesson): boolean {
  if (lesson.isStub || !progress.gatingEnabled) {
    return !lesson.isStub;
  }

  const lessonTier = curriculum.find((tier) => tier.id === lesson.tier);
  if (!lessonTier) {
    return false;
  }

  for (const tier of curriculum) {
    if (tier.order < lessonTier.order) {
      const tierComplete = tier.lessons.filter((entry) => !entry.isStub).every((entry) => isLessonCompleted(progress, entry.id));
      if (!tierComplete) {
        return false;
      }
    }
  }

  const lessonsInTier = lessonTier.lessons.filter((entry) => !entry.isStub).sort((left, right) => left.order - right.order);
  const firstIncompleteLesson = lessonsInTier.find((entry) => !isLessonCompleted(progress, entry.id));
  if (!firstIncompleteLesson) {
    return true;
  }

  return firstIncompleteLesson.id === lesson.id || isLessonCompleted(progress, lesson.id);
}

export function getNextLesson(curriculum: LearningTier[], lessonId: string): Lesson | null {
  const orderedLessons = curriculum
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((tier) => tier.lessons.slice().sort((left, right) => left.order - right.order))
    .filter((lesson) => !lesson.isStub);
  const index = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) {
    return null;
  }
  return orderedLessons[index + 1] ?? null;
}
