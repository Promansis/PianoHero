import { useMemo, useState } from 'react';
import type { LearningProgress, LearningTier, Lesson } from '../../lib/learning/types';
import { isLessonCompleted, isLessonUnlocked } from '../../lib/learning/learningProgress';

interface LearnHubScreenProps {
  tiers: LearningTier[];
  progress: LearningProgress;
  onOpenLesson: (lessonId: string) => void;
  onToggleGating: (enabled: boolean) => void;
}

function countCompletedLessons(lessons: Lesson[], progress: LearningProgress): number {
  return lessons.filter((lesson) => !lesson.isStub && isLessonCompleted(progress, lesson.id)).length;
}

export function LearnHubScreen({ tiers, progress, onOpenLesson, onToggleGating }: LearnHubScreenProps) {
  const [openTierIds, setOpenTierIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tiers.map((tier, index) => [tier.id, index === 0])),
  );

  const totalCompletedLessons = useMemo(
    () => tiers.flatMap((tier) => tier.lessons).filter((lesson) => isLessonCompleted(progress, lesson.id)).length,
    [progress, tiers],
  );
  const totalLessons = useMemo(
    () => tiers.flatMap((tier) => tier.lessons).filter((lesson) => !lesson.isStub).length,
    [tiers],
  );

  return (
    <main className="app-shell learn-hub-screen">
      <section className="panel theory-hub-hero">
        <div>
          <p className="eyebrow">Learn Hub</p>
          <h1>Progressive piano curriculum</h1>
          <p className="song-title">
            Start from posture and keyboard geography, then climb through drills, scales, intervals, and theory checkpoints.
          </p>
        </div>
        <div className="learn-hub-summary">
          <strong>{totalCompletedLessons} / {totalLessons}</strong>
          <span>Lessons completed</span>
        </div>
      </section>

      <section className="panel learn-hub-controls">
        <label className="learn-hub-toggle">
          <span>Sequential unlock</span>
          <input
            type="checkbox"
            checked={progress.gatingEnabled}
            onChange={(event) => onToggleGating(event.target.checked)}
          />
        </label>
        <p className="panel-copy">
          {progress.gatingEnabled
            ? 'Lessons unlock in order within each tier. Stubs stay visible but unavailable.'
            : 'Free navigation is on. You can open any finished curriculum lesson in any order.'}
        </p>
      </section>

      <section className="learn-tier-list">
        {tiers.map((tier) => {
          const completedCount = countCompletedLessons(tier.lessons, progress);
          const activeLessonCount = tier.lessons.filter((lesson) => !lesson.isStub).length;
          const isOpen = openTierIds[tier.id] ?? false;

          return (
            <article className="panel learn-tier" key={tier.id}>
              <button
                className="learn-tier-header"
                onClick={() => setOpenTierIds((current) => ({ ...current, [tier.id]: !isOpen }))}
                aria-expanded={isOpen}
              >
                <div>
                  <p className="eyebrow">Tier {tier.order}</p>
                  <h2>{tier.title}</h2>
                  <p className="panel-copy">{tier.summary}</p>
                </div>
                <div className="learn-tier-meta">
                  <strong>{completedCount} / {activeLessonCount}</strong>
                  <span>{isOpen ? 'Hide' : 'Show'}</span>
                </div>
              </button>

              {isOpen ? (
                <div className="learn-tier-lessons">
                  {tier.lessons
                    .slice()
                    .sort((left, right) => left.order - right.order)
                    .map((lesson) => {
                      const completed = isLessonCompleted(progress, lesson.id);
                      const unlocked = isLessonUnlocked(tiers, progress, lesson);
                      const disabled = lesson.isStub || !unlocked;
                      const statusLabel = lesson.isStub
                        ? 'Coming soon'
                        : completed
                          ? 'Completed'
                          : unlocked
                            ? 'Ready'
                            : 'Locked';

                      return (
                        <button
                          key={lesson.id}
                          className={`learn-lesson-card ${completed ? 'completed' : ''} ${disabled ? 'disabled' : ''}`}
                          disabled={disabled}
                          onClick={() => onOpenLesson(lesson.id)}
                        >
                          <div className="learn-lesson-status">{completed ? 'Done' : unlocked ? 'Open' : lesson.isStub ? 'Soon' : 'Lock'}</div>
                          <div>
                            <p className="eyebrow">Lesson {lesson.order}</p>
                            <h3>{lesson.title}</h3>
                            <p className="panel-copy">{lesson.summary}</p>
                          </div>
                          <div className="learn-lesson-meta">
                            <strong>{lesson.estMinutes} min</strong>
                            <span>{statusLabel}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
