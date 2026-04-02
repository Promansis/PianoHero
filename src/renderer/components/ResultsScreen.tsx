import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoopRange, SessionConfig } from '../../lib/game/types';
import type { SongRow, UserStatsRow } from '../../shared/dbTypes';
import type { GameResult } from '../../lib/game/types';
import { PerformanceGraph } from './PerformanceGraph';

interface ResultsScreenProps {
  result: GameResult;
  song: SongRow;
  sessionConfig: SessionConfig;
  baselineStats: UserStatsRow | null;
  onRetry: () => void;
  onPracticeSections: (loopRange: LoopRange) => void;
  onMainMenu: () => void;
  hasNextSong: boolean;
  onNextSong: () => void;
}

function getGrade(accuracy: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (accuracy >= 95) {
    return 'S';
  }
  if (accuracy >= 90) {
    return 'A';
  }
  if (accuracy >= 80) {
    return 'B';
  }
  if (accuracy >= 70) {
    return 'C';
  }
  if (accuracy >= 60) {
    return 'D';
  }
  return 'F';
}

function getStarCount(accuracy: number): number {
  if (accuracy >= 95) {
    return 5;
  }
  if (accuracy >= 85) {
    return 4;
  }
  if (accuracy >= 70) {
    return 3;
  }
  if (accuracy >= 50) {
    return 2;
  }
  return 1;
}

function buildFeedback(result: GameResult): string {
  if (result.misses >= Math.max(5, result.perfectHits)) {
    return 'Reduce the tempo slightly and focus on keeping the pulse steady through the weakest measures.';
  }
  if (result.goodHits + result.okHits > result.perfectHits) {
    return 'Your note choices are mostly right. Push for cleaner timing and aim to convert good hits into perfect hits.';
  }
  if (result.measureAccuracy.some((entry) => entry.accuracy < 70)) {
    return 'The difficult measures are localized. Loop them in learning mode and isolate one hand if needed.';
  }
  return 'This run is stable. Raise the tempo or switch back to full Piano Hero mode for a harder pass.';
}

export function ResultsScreen({
  result,
  song,
  sessionConfig,
  baselineStats,
  onRetry,
  onPracticeSections,
  onMainMenu,
  hasNextSong,
  onNextSong,
}: ResultsScreenProps) {
  const didPersistRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const grade = getGrade(result.accuracy);
  const stars = getStarCount(result.accuracy);
  const troubleSpots = result.measureAccuracy.filter((entry) => entry.accuracy < 70);
  const feedback = buildFeedback(result);

  useEffect(() => {
    if (didPersistRef.current || !window.appBridge) {
      return;
    }

    didPersistRef.current = true;
    void window.appBridge
      .saveGameResult({
        songId: song.id,
        score: result.score,
        accuracy: result.accuracy,
        maxCombo: result.maxCombo,
        perfectHits: result.perfectHits,
        goodHits: result.goodHits,
        okHits: result.okHits,
        misses: result.misses,
        tempo: result.tempo,
        mode: result.mode,
        durationSec: result.durationSec,
      })
      .catch((error) => {
        setSaveError((error as Error).message);
      });
  }, [result, song.id]);

  const comparison = useMemo(() => {
    if (!baselineStats) {
      return {
        bestScoreDelta: result.score,
        bestAccuracyDelta: result.accuracy,
        averageScoreDelta: result.score,
        isNewBest: result.score > 0,
      };
    }

    return {
      bestScoreDelta: result.score - baselineStats.bestScore,
      bestAccuracyDelta: Math.round((result.accuracy - baselineStats.bestAccuracy) * 10) / 10,
      averageScoreDelta: Math.round(result.score - baselineStats.averageScore),
      isNewBest: result.score > baselineStats.bestScore,
    };
  }, [baselineStats, result]);

  const practiceLoop = troubleSpots.length
    ? {
        startMeasure: troubleSpots[0].measure,
        endMeasure: troubleSpots[Math.min(troubleSpots.length - 1, 2)].measure,
      }
    : null;

  return (
    <main className="app-shell results-screen">
      <section className="panel results-hero">
        <div>
          <p className="eyebrow">Results</p>
          <h1>{song.title}</h1>
          <p className="song-title">
            {sessionConfig.mode === 'learning'
              ? 'Learning run complete. Review the weak measures and decide what to loop next.'
              : 'Run complete. Review the timing spread and weak measures.'}
          </p>
        </div>
        <div className={`grade-badge grade-${grade}`}>{grade}</div>
      </section>

      <section className="results-grid">
        <article className="panel score-display">
          <span>Final Score</span>
          <strong>{result.score.toLocaleString()}</strong>
          <p>{result.accuracy.toFixed(1)}% accuracy</p>
          <div className="star-rating">{stars} / 5 stars</div>
        </article>

        <article className="panel results-summary">
          <div className="result-stat">
            <span>Max Combo</span>
            <strong>{result.maxCombo}</strong>
          </div>
          <div className="result-stat">
            <span>Tempo</span>
            <strong>{Math.round(result.tempo * 100)}%</strong>
          </div>
          <div className="result-stat">
            <span>Mode</span>
            <strong>{result.mode === 'piano-hero' ? 'Piano Hero' : 'Learning'}</strong>
          </div>
        </article>
      </section>

      <section className="timing-breakdown">
        <article className="panel timing-card perfect">
          <span>Perfect</span>
          <strong>{result.perfectHits}</strong>
        </article>
        <article className="panel timing-card good">
          <span>Good</span>
          <strong>{result.goodHits}</strong>
        </article>
        <article className="panel timing-card ok">
          <span>Ok</span>
          <strong>{result.okHits}</strong>
        </article>
        <article className="panel timing-card miss">
          <span>Miss</span>
          <strong>{result.misses}</strong>
        </article>
      </section>

      <section className="results-grid wide-layout">
        <article className="panel performance-graph-shell">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Performance Graph</p>
              <h2>Measure Accuracy</h2>
            </div>
            <p className="panel-copy">Red regions highlight measures below 70%.</p>
          </div>
          <PerformanceGraph data={result.measureAccuracy} />
        </article>

        <article className="panel trouble-spots">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Comparisons</p>
              <h2>Progress Check</h2>
            </div>
          </div>
          <div className="result-stat">
            <span>Best Score Delta</span>
            <strong>{comparison.bestScoreDelta >= 0 ? '+' : ''}{comparison.bestScoreDelta.toLocaleString()}</strong>
          </div>
          <div className="result-stat">
            <span>Best Accuracy Delta</span>
            <strong>{comparison.bestAccuracyDelta >= 0 ? '+' : ''}{comparison.bestAccuracyDelta}%</strong>
          </div>
          <div className="result-stat">
            <span>Average Score Delta</span>
            <strong>{comparison.averageScoreDelta >= 0 ? '+' : ''}{comparison.averageScoreDelta.toLocaleString()}</strong>
          </div>
          <p className="panel-copy">{comparison.isNewBest ? 'New personal best.' : 'Not a best run yet, but the weak measures are clearer now.'}</p>
        </article>
      </section>

      <section className="results-grid wide-layout">
        <article className="panel feedback-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Actionable Feedback</p>
              <h2>Next Practice Move</h2>
            </div>
          </div>
          <p className="panel-copy">{feedback}</p>
          {saveError && <p className="panel-copy">Unable to save this run: {saveError}</p>}
        </article>

        <article className="panel trouble-spots">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trouble Spots</p>
              <h2>Focus Measures</h2>
            </div>
          </div>
          {troubleSpots.length === 0 ? (
            <p className="empty-state">No problem measures detected in this run.</p>
          ) : (
            <ul className="trouble-spot-list">
              {troubleSpots.map((entry) => (
                <li key={entry.measure}>
                  <span>Measure {entry.measure + 1}</span>
                  <strong>{entry.accuracy}%</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="results-actions">
        <button className="primary-button" onClick={onRetry}>
          Retry
        </button>
        {hasNextSong && (
          <button className="primary-button" onClick={onNextSong}>
            Next Song
          </button>
        )}
        <button
          className="secondary-button"
          disabled={!practiceLoop}
          onClick={() => {
            if (practiceLoop) {
              onPracticeSections(practiceLoop);
            }
          }}
        >
          Practice Sections
        </button>
        <button className="secondary-button" onClick={onMainMenu}>
          Main Menu
        </button>
      </section>
    </main>
  );
}
