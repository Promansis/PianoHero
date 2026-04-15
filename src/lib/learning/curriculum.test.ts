import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, CURRICULUM, getLessonById, getTierByLessonId } from './curriculum';
import { EMPTY_LEARNING_PROGRESS, getNextLesson, isLessonUnlocked, markLessonCompleted } from './learningProgress';

describe('curriculum', () => {
  it('uses unique lesson ids with matching tier membership', () => {
    const ids = ALL_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const lesson of ALL_LESSONS) {
      expect(getLessonById(lesson.id)?.tier).toBe(lesson.tier);
      expect(getTierByLessonId(lesson.id)?.id).toBe(lesson.tier);
    }
  });

  it('gives every non-stub lesson at least one step', () => {
    const activeLessons = ALL_LESSONS.filter((lesson) => !lesson.isStub);
    expect(activeLessons.length).toBeGreaterThan(0);
    expect(activeLessons.every((lesson) => lesson.steps.length > 0)).toBe(true);
  });

  it('has no remaining stub lessons in the published curriculum', () => {
    expect(ALL_LESSONS.every((lesson) => !lesson.isStub)).toBe(true);
  });

  it('chooses the next lesson in sequence now that lesson 5 and 6 are populated', () => {
    expect(getNextLesson(CURRICULUM, 'novice-04-first-c-pattern')?.id).toBe('novice-05-rhythm-values');
    expect(getNextLesson(CURRICULUM, 'novice-06-first-song')?.id).toBe('beginner-01-finger-independence');
  });

  it('locks later lessons when sequential gating is enabled', () => {
    const beginnerLesson = getLessonById('beginner-01-finger-independence');
    expect(beginnerLesson).toBeDefined();

    const lockedProgress = {
      ...EMPTY_LEARNING_PROGRESS,
      gatingEnabled: true,
    };
    expect(isLessonUnlocked(CURRICULUM, lockedProgress, beginnerLesson!)).toBe(false);

    const unlockedProgress = CURRICULUM
      .find((tier) => tier.id === 'novice')!
      .lessons
      .filter((lesson) => !lesson.isStub)
      .reduce((progress, lesson) => markLessonCompleted(progress, lesson.id), lockedProgress);
    expect(isLessonUnlocked(CURRICULUM, unlockedProgress, beginnerLesson!)).toBe(true);
  });
});
