import { useEffect, useState } from 'react';
import type { TheoryResultType, TheoryStatsRow } from '../../shared/dbTypes';

interface TheoryHubScreenProps {
  onStartScalePractice: (preset?: { root: number; scaleName: string }) => void;
  onStartIntervalTrainer: (preset?: { difficulty: string }) => void;
  onStartQuiz: (preset?: { quizType: string }) => void;
}

const CARD_CONFIG: Array<{
  type: TheoryResultType;
  title: string;
  description: string;
  onStart: (props: TheoryHubScreenProps) => void;
}> = [
  {
    type: 'scale-practice',
    title: 'Scale Practice',
    description: 'Run structured scale drills with live note validation and keyboard highlighting.',
    onStart: (props) => props.onStartScalePractice(),
  },
  {
    type: 'interval-trainer',
    title: 'Interval Trainer',
    description: 'Hear intervals, identify them, and build streaks across difficulty tiers.',
    onStart: (props) => props.onStartIntervalTrainer(),
  },
  {
    type: 'quiz',
    title: 'Theory Quizzes',
    description: 'Mix chord, scale, and interval identification into short scored sessions.',
    onStart: (props) => props.onStartQuiz(),
  },
];

export function TheoryHubScreen(props: TheoryHubScreenProps) {
  const [statsByType, setStatsByType] = useState<Record<TheoryResultType, TheoryStatsRow | null>>({
    quiz: null,
    'interval-trainer': null,
    'scale-practice': null,
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!window.appBridge) {
        return;
      }

      const entries = await Promise.all(
        CARD_CONFIG.map(async ({ type }) => [type, await window.appBridge!.getTheoryStats(type)] as const),
      );
      setStatsByType(Object.fromEntries(entries) as Record<TheoryResultType, TheoryStatsRow>);
    };

    void loadStats();
  }, []);

  return (
    <main className="app-shell theory-hub-screen">
      <section className="panel theory-hub-hero">
        <div>
          <p className="eyebrow">Theory Hub</p>
          <h1>Music theory practice</h1>
          <p className="song-title">Use scales, intervals, and quizzes to connect ear training with the keyboard.</p>
        </div>
      </section>

      <section className="theory-card-grid">
        {CARD_CONFIG.map((card) => {
          const stats = statsByType[card.type];
          return (
            <article className="panel theory-card" key={card.type}>
              <p className="eyebrow">{card.title}</p>
              <h2>{card.title}</h2>
              <p className="panel-copy">{card.description}</p>
              <div className="theory-card-stats">
                <div>
                  <span>Sessions</span>
                  <strong>{stats?.sessionCount ?? 0}</strong>
                </div>
                <div>
                  <span>Best Score</span>
                  <strong>{stats?.bestScore ?? 0}</strong>
                </div>
                <div>
                  <span>Avg Accuracy</span>
                  <strong>{stats ? `${stats.averageAccuracy.toFixed(1)}%` : '0.0%'}</strong>
                </div>
              </div>
              <button className="primary-button" onClick={() => card.onStart(props)}>
                Start
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
