import { describe, expect, it, vi } from 'vitest';
import {
  EMPTY_LEARNING_PROGRESS,
  loadLearningProgress,
  markLessonCompleted,
  markLessonStepCompleted,
  saveLearningProgress,
  setLearningGating,
} from './learningProgress';

function createBridge(initial: Record<string, string | null>) {
  const store = new Map(Object.entries(initial));
  return {
    getSetting: vi.fn(async (category: string, key: string) => store.get(`${category}:${key}`) ?? null),
    setSetting: vi.fn(async (category: string, key: string, value: string) => {
      store.set(`${category}:${key}`, value);
    }),
    store,
  };
}

describe('learningProgress', () => {
  it('round-trips progress through the settings bridge', async () => {
    const bridge = createBridge({});
    const progress = setLearningGating(
      markLessonCompleted(markLessonStepCompleted(EMPTY_LEARNING_PROGRESS, 'novice-01-keyboard-map', 2), 'novice-01-keyboard-map'),
      true,
    );

    await saveLearningProgress(bridge, progress);
    const loaded = await loadLearningProgress(bridge);

    expect(loaded).toEqual(progress);
  });

  it('falls back safely when stored JSON is invalid', async () => {
    const bridge = createBridge({
      'learning:completedLessons': 'not-json',
      'learning:completedSteps': '{bad json',
      'learning:gatingEnabled': 'false',
    });

    const loaded = await loadLearningProgress(bridge);

    expect(loaded.completedLessons).toEqual([]);
    expect(loaded.completedSteps).toEqual({});
    expect(loaded.gatingEnabled).toBe(false);
  });
});