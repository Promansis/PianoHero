import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoopRange, SessionConfig } from '../../lib/game/types';
import type { GameResult } from '../../lib/game/types';
import { parseMidiFile } from '../../lib/midi/midiFileParser';
import type { SongTheoryAnalysis, TheorySuggestion } from '../../lib/theory/songAnalysis';
import { analyzeSong } from '../../lib/theory/songAnalysis';
import type { SongRow, TroubleSpotRow, UserStatsRow } from '../../shared/dbTypes';
import { PerformanceGraph } from './PerformanceGraph';

interface ResultsScreenProps {
  result: GameResult;
  song: SongRow;
  sessionConfig: SessionConfig;
  baselineStats: UserStatsRow | null;
  unlockedRewardIds?: Set<string>;
  onAchievementsUnlocked?: (achievementIds: string[]) => void;
  onDailyGoalReached?: () => void;
  onSongGoalReached?: () => void;
  onRetry: () => void;
  onPracticeSections: (loopRange: LoopRange) => void;
  onStartTheoryPractice: (suggestion: TheorySuggestion) => void;
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
  unlockedRewardIds,
  onAchievementsUnlocked,
  onDailyGoalReached,
  onSongGoalReached,
  onRetry,
  onPracticeSections,
  onStartTheoryPractice,
  onMainMenu,
  hasNextSong,
  onNextSong,
}: ResultsScreenProps) {
  const didPersistRef = useRef(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SongTheoryAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [historicalTroubleSpots, setHistoricalTroubleSpots] = useState<TroubleSpotRow[]>([]);
  const [troubleSpotsLoading, setTroubleSpotsLoading] = useState(true);
  const grade = getGrade(result.accuracy);
  const stars = getStarCount(result.accuracy);
  const isMaestro = unlockedRewardIds?.has('title:maestro') ?? false;
  const hasMaestroConfetti = unlockedRewardIds?.has('effect:maestro-confetti') ?? false;
  const isTemporarySong = song.id.startsWith('temp-');
  const troubleSpots = result.measureAccuracy.filter((entry) => entry.accuracy < 70);
  const feedback = buildFeedback(result);

  useEffect(() => {
    let ignore = false;
    if (didPersistRef.current) {
      return;
    }
    const bridge = window.appBridge;
    if (!bridge || isTemporarySong) {
      setTroubleSpotsLoading(false);
      return;
    }

    didPersistRef.current = true;
    void (async () => {
      try {
        const outcome = await bridge.saveGameResult({
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
          measureAccuracy: result.measureAccuracy,
        });
        onAchievementsUnlocked?.(outcome.unlockedAchievementIds);
        if (outcome.dailyGoalReached) onDailyGoalReached?.();
        if (outcome.songGoalReached) onSongGoalReached?.();
        const nextTroubleSpots = await bridge.getTroubleSpots(song.id);
        if (ignore) {
          return;
        }
        setHistoricalTroubleSpots(nextTroubleSpots);
        setSaveError(null);
      } catch (error) {
        if (!ignore) {
          setSaveError((error as Error).message);
        }
      } finally {
        if (!ignore) {
          setTroubleSpotsLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isTemporarySong, onAchievementsUnlocked, onDailyGoalReached, onSongGoalReached, result, song.id]);

  useEffect(() => {
    let ignore = false;
    const loadAnalysis = async () => {
      if (!window.appBridge || isTemporarySong) {
        return;
      }

      try {
        const bytes = await window.appBridge.loadMidiFileData(song.id);
        const parsedSong = parseMidiFile(bytes.slice().buffer, {
          songId: song.id,
          title: song.title,
        });
        if (ignore) {
          return;
        }
        setAnalysis(analyzeSong(parsedSong));
        setAnalysisError(null);
      } catch (error) {
        if (!ignore) {
          setAnalysisError((error as Error).message);
        }
      }
    };

    void loadAnalysis();
    return () => {
      ignore = true;
    };
  }, [isTemporarySong, song.id, song.title]);

  useEffect(() => {
    if ((grade !== 'S' && grade !== 'A') || !hasMaestroConfetti) return;
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const COLORS = isMaestro
      ? ['#ffd54f', '#ffecb3', '#fff59d', '#f9a825', '#ffb300', '#ffffff']
      : ['#f9a825', '#e53935', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00', '#00acc1'];
    const BASE_COUNT = grade === 'S' ? 120 : 60;
    const COUNT = isMaestro ? Math.round(BASE_COUNT * 1.8) : BASE_COUNT;
    type Piece = { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; w: number; h: number; color: string; opacity: number };
    const pieces: Piece[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.15,
      w: 8 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 0.85 + Math.random() * 0.15,
    }));

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rot += p.rotV;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [grade, hasMaestroConfetti, isMaestro]);

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

  const troubleSpotDetails = useMemo(
    () =>
      troubleSpots
        .map((entry) => {
          const history = historicalTroubleSpots.find(
            (spot) => entry.measure >= spot.measureStart && entry.measure <= spot.measureEnd,
          );
          const lowestAccuracy = history?.lowestAccuracy ?? null;
          const improvementText =
            lowestAccuracy !== null && lowestAccuracy < entry.accuracy
              ? `Accuracy improved from ${Math.round(lowestAccuracy)}% -> ${Math.round(entry.accuracy)}%`
              : lowestAccuracy !== null
                ? `Lowest recorded accuracy: ${Math.round(lowestAccuracy)}%`
                : null;

          return {
            entry,
            history,
            improvementText,
          };
        })
        .sort((left, right) => left.entry.accuracy - right.entry.accuracy),
    [historicalTroubleSpots, troubleSpots],
  );

  const practiceLoop = troubleSpotDetails.length
    ? {
        startMeasure: troubleSpotDetails[0].history?.measureStart ?? troubleSpotDetails[0].entry.measure,
        endMeasure: troubleSpotDetails[0].history?.measureEnd ?? troubleSpotDetails[0].entry.measure,
      }
    : null;

  return (
    <main className="app-shell results-screen">
      {hasMaestroConfetti && (grade === 'S' || grade === 'A') && (
        <canvas ref={confettiCanvasRef} className="confetti-canvas" aria-hidden="true" />
      )}
      {isMaestro && (grade === 'S' || grade === 'A') && (
        <section className="panel maestro-banner" aria-label="Maestro title active">
          <div className="maestro-banner-icon">★</div>
          <div>
            <p className="eyebrow">Maestro</p>
            <strong>Another clean pass, Maestro.</strong>
            <p className="panel-copy">Your 90%+ streak across the library has earned a richer celebration.</p>
          </div>
        </section>
      )}
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
          {isTemporarySong && <p className="panel-copy">Unsaved MIDI run. Results, trouble spots, and practice history were not saved.</p>}
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
              {troubleSpotDetails.map(({ entry, history, improvementText }) => (
                <li
                  key={entry.measure}
                  className={history?.isResolved ? 'trouble-spot-resolved' : undefined}
                >
                  <div>
                    <span>Measure {entry.measure + 1}</span>
                    {history && (
                      <p className="panel-copy">
                        You&apos;ve struggled with this section {history.struggleCount} time{history.struggleCount === 1 ? '' : 's'}.
                      </p>
                    )}
                    {improvementText && <p className="panel-copy">{improvementText}</p>}
                    {history?.isResolved && <p className="panel-copy">Resolved after repeated clean passes.</p>}
                  </div>
                  <strong>{entry.accuracy}%</strong>
                </li>
              ))}
            </ul>
          )}
          {troubleSpotsLoading && !isTemporarySong && <p className="panel-copy">Loading historical trouble spot data.</p>}
        </article>
      </section>

      <section className="panel theory-connections-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Theory Connections</p>
            <h2>Practice from the song itself</h2>
          </div>
        </div>
        {analysisError && <p className="panel-copy">Theory analysis unavailable: {analysisError}</p>}
        {!analysis && !analysisError && !isTemporarySong && <p className="panel-copy">Analyzing key center, harmony, and practice suggestions.</p>}
        {isTemporarySong && <p className="panel-copy">Theory analysis is available after importing the song into the library.</p>}
        {analysis && (
          <div className="theory-connections-grid">
            <div className="result-stat">
              <span>Detected Key</span>
              <strong>{analysis.detectedKey.keyName}</strong>
            </div>
            <div className="result-stat">
              <span>Chord Progression</span>
              <strong>{analysis.chordProgression.slice(0, 4).map((chord) => chord.label).join(' | ') || 'No stable block chords detected'}</strong>
            </div>
            <div className="result-stat">
              <span>Scales Used</span>
              <strong>{analysis.scalesUsed.map((scale) => scale.name).join(', ')}</strong>
            </div>
            <div className="theory-suggestion-list">
              {analysis.suggestedPractice.map((suggestion) => (
                <button
                  key={suggestion.label}
                  className="secondary-button theory-suggestion-button"
                  onClick={() => onStartTheoryPractice(suggestion)}
                >
                  <strong>{suggestion.label}</strong>
                  <span>{suggestion.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {analysis && (practiceLoop !== null || analysis.suggestedPractice.length > 0) && (
        <section className="panel practice-routine-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Practice Routine</p>
              <h2>Structured next session</h2>
            </div>
          </div>
          <p className="panel-copy">
            Follow these steps in order to make the most of your next practice slot.
          </p>
          <ol className="practice-routine-steps">
            {analysis.suggestedPractice.length > 0 && (
              <li className="practice-routine-step">
                <div className="step-number">1</div>
                <div className="step-body">
                  <strong>Warm-up: {analysis.suggestedPractice[0].label}</strong>
                  <p className="panel-copy">{analysis.suggestedPractice[0].description}</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => onStartTheoryPractice(analysis.suggestedPractice[0])}
                >
                  Start
                </button>
              </li>
            )}
            {practiceLoop !== null && (
              <li className="practice-routine-step">
                <div className="step-number">{analysis.suggestedPractice.length > 0 ? 2 : 1}</div>
                <div className="step-body">
                  <strong>
                    Loop trouble measures {practiceLoop.startMeasure + 1}–{practiceLoop.endMeasure + 1}
                  </strong>
                  <p className="panel-copy">
                    Isolate the weakest section in learning mode and repeat until accuracy improves.
                  </p>
                </div>
                <button className="secondary-button" onClick={() => onPracticeSections(practiceLoop)}>
                  Start
                </button>
              </li>
            )}
          </ol>
        </section>
      )}

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
        {analysis?.suggestedPractice[0] && (
          <button className="secondary-button" onClick={() => onStartTheoryPractice(analysis.suggestedPractice[0])}>
            Start Theory Practice
          </button>
        )}
        <button className="secondary-button" onClick={onMainMenu}>
          Main Menu
        </button>
      </section>
    </main>
  );
}
