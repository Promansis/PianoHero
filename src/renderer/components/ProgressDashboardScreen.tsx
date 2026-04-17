import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS } from '../../lib/achievements/achievementDefinitions';
import type { AchievementRow, GlobalTroubleSpot, PracticeStreak, ProgressStatsResult, TopSongStat } from '../../shared/dbTypes';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface WeekComparison {
  thisWeek: { practiceMinutes: number; songsPlayed: number; avgAccuracy: number | null };
  lastWeek: { practiceMinutes: number; songsPlayed: number; avgAccuracy: number | null };
}

function weekComparisonDelta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) {
    return '—';
  }
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function ProgressDashboardScreen() {
  const [stats, setStats] = useState<ProgressStatsResult | null>(null);
  const [streak, setStreak] = useState<PracticeStreak | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [weekComparison, setWeekComparison] = useState<WeekComparison | null>(null);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [topSongs, setTopSongs] = useState<TopSongStat[]>([]);
  const [troubleSpots, setTroubleSpots] = useState<GlobalTroubleSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!window.appBridge) {
        setErrorMessage('The app bridge is unavailable.');
        setIsLoading(false);
        return;
      }

      try {
        const fromDate = daysAgo(29);
        const toDate = daysAgo(0);
        const thisWeekFrom = daysAgo(6);
        const lastWeekFrom = daysAgo(13);
        const lastWeekTo = daysAgo(7);
        const [nextStats, nextStreak, nextAchievements, thisWeekStats, lastWeekStats, rawDailyGoal, nextTopSongs, nextTroubleSpots] = await Promise.all([
          window.appBridge.getProgressStats(fromDate, toDate),
          window.appBridge.getPracticeStreak(),
          window.appBridge.getAllAchievements(),
          window.appBridge.getProgressStats(thisWeekFrom, toDate),
          window.appBridge.getProgressStats(lastWeekFrom, lastWeekTo),
          window.appBridge.getSetting('practice', 'dailyGoalMinutes'),
          window.appBridge.getProgressTopSongs(),
          window.appBridge.getAllUnresolvedTroubleSpots(),
        ]);

        setStats(nextStats);
        setStreak(nextStreak);
        setAchievements(nextAchievements);
        setTopSongs(nextTopSongs);
        setTroubleSpots(nextTroubleSpots);

        const parsedGoal = Number(rawDailyGoal);
        if (Number.isFinite(parsedGoal) && parsedGoal > 0) {
          setDailyGoalMinutes(parsedGoal);
        }
        const today = daysAgo(0);
        const todayEntry = nextStats.practiceTimeByDay.find((d) => d.date === today);
        setTodayMinutes(todayEntry?.minutes ?? 0);

        const sumMinutes = (s: ProgressStatsResult) =>
          s.practiceTimeByDay.reduce((acc, d) => acc + d.minutes, 0);
        const sumSongs = (s: ProgressStatsResult) =>
          s.songsPlayedByWeek.reduce((acc, w) => acc + w.count, 0);
        const avgAccuracy = (s: ProgressStatsResult): number | null => {
          const entries = s.accuracyTrend.filter((d) => d.avgAccuracy > 0);
          if (entries.length === 0) {
            return null;
          }
          return Math.round(entries.reduce((acc, d) => acc + d.avgAccuracy, 0) / entries.length * 10) / 10;
        };

        setWeekComparison({
          thisWeek: {
            practiceMinutes: sumMinutes(thisWeekStats),
            songsPlayed: sumSongs(thisWeekStats),
            avgAccuracy: avgAccuracy(thisWeekStats),
          },
          lastWeek: {
            practiceMinutes: sumMinutes(lastWeekStats),
            songsPlayed: sumSongs(lastWeekStats),
            avgAccuracy: avgAccuracy(lastWeekStats),
          },
        });

        setErrorMessage(null);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const unlockedAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.unlockedAt),
    [achievements],
  );

  if (isLoading) {
    return (
      <main className="app-shell progress-dashboard-screen">
        <section className="panel library-header">
          <div>
            <p className="eyebrow">Progress Dashboard</p>
            <h1>Loading progress</h1>
            <p className="song-title">Gathering practice history, streaks, and chart data.</p>
          </div>
        </section>
        <section className="panel empty-state-panel">
          <div className="loading-spinner" />
        </section>
      </main>
    );
  }

  if (!stats || !streak) {
    return (
      <main className="app-shell progress-dashboard-screen">
        <section className="panel library-header">
          <div>
            <p className="eyebrow">Progress Dashboard</p>
            <h1>Progress unavailable</h1>
            <p className="song-title">{errorMessage ?? 'No progress data is available yet.'}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell progress-dashboard-screen">
      <section className="panel library-header">
        <div>
          <p className="eyebrow">Progress Dashboard</p>
          <h1>Long-term practice view</h1>
          <p className="song-title">Track consistency, workload, and how cleanly your scores are trending.</p>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        <article className="panel dashboard-stat-card">
          <span>Total Songs</span>
          <strong>{stats.totalStats.totalSongs}</strong>
        </article>
        <article className="panel dashboard-stat-card">
          <span>Mastered</span>
          <strong>{stats.totalStats.songsMastered}</strong>
        </article>
        <article className="panel dashboard-stat-card">
          <span>Practice Time</span>
          <strong>{formatDuration(stats.totalStats.totalPracticeTimeSec)}</strong>
        </article>
        <article className="panel dashboard-stat-card">
          <span>Favorite Genre</span>
          <strong>{stats.totalStats.favoriteGenre}</strong>
        </article>
      </section>

      {dailyGoalMinutes !== null && (
        <section className="panel daily-goal-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Daily Goal</p>
              <h2>Today&apos;s practice</h2>
            </div>
            <strong className="daily-goal-fraction">{todayMinutes}m / {dailyGoalMinutes}m</strong>
          </div>
          <div className="daily-goal-bar-track">
            <div
              className="daily-goal-bar-fill"
              style={{ width: `${Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))}%` }}
            />
          </div>
          <p className="panel-copy">
            {todayMinutes >= dailyGoalMinutes
              ? 'Goal reached for today.'
              : `${dailyGoalMinutes - todayMinutes} minute${dailyGoalMinutes - todayMinutes === 1 ? '' : 's'} remaining to hit your daily goal.`}
          </p>
        </section>
      )}

      <section className="dashboard-chart-grid">
        <article className="panel chart-panel">
          <LineChart
            title="Practice Time (Last 30 Days)"
            color="var(--color-accent)"
            data={stats.practiceTimeByDay.map((entry) => ({
              label: entry.date.slice(5),
              value: entry.minutes,
            }))}
            emptyLabel="No practice time recorded yet."
          />
        </article>
        <article className="panel chart-panel">
          <BarChart
            title="Songs Played Per Week"
            color="var(--color-accent-secondary)"
            data={stats.songsPlayedByWeek.map((entry) => ({
              label: entry.weekStart.slice(5),
              value: entry.count,
            }))}
            emptyLabel="No weekly song history yet."
          />
        </article>
        <article className="panel chart-panel">
          <LineChart
            title="Accuracy Trend"
            color="var(--color-good)"
            data={stats.accuracyTrend.map((entry) => ({
              label: entry.date.slice(5),
              value: entry.avgAccuracy,
            }))}
            maxValue={100}
            emptyLabel="No scored song sessions yet."
          />
        </article>
      </section>

      <section className="dashboard-chart-grid dashboard-chart-grid--two-col">
        <article className="panel chart-panel">
          <BarChart
            title="Theory Sessions (Last 30 Days)"
            color="var(--color-ok)"
            data={stats.theorySessionsByDay.map((entry) => ({
              label: entry.date.slice(5),
              value: entry.sessions,
            }))}
            emptyLabel="No theory sessions recorded yet."
          />
        </article>
        <article className="panel hit-quality-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Hit Quality (Last 30 Days)</p>
              <h2>Note breakdown</h2>
            </div>
          </div>
          {(() => {
            const { perfect, good, ok, misses } = stats.hitQuality;
            const total = perfect + good + ok + misses;
            if (total === 0) {
              return <p className="empty-state">No scored sessions yet.</p>;
            }
            const pct = (n: number) => Math.round((n / total) * 100);
            return (
              <>
                <div className="hit-quality-bar">
                  <div className="hit-quality-segment hit-quality-perfect" style={{ width: `${pct(perfect)}%` }} />
                  <div className="hit-quality-segment hit-quality-good" style={{ width: `${pct(good)}%` }} />
                  <div className="hit-quality-segment hit-quality-ok" style={{ width: `${pct(ok)}%` }} />
                  <div className="hit-quality-segment hit-quality-miss" style={{ width: `${pct(misses)}%` }} />
                </div>
                <div className="hit-quality-legend">
                  <div className="hit-quality-legend-item">
                    <span className="hit-quality-dot hit-quality-perfect" />
                    <span>Perfect</span>
                    <strong>{pct(perfect)}%</strong>
                  </div>
                  <div className="hit-quality-legend-item">
                    <span className="hit-quality-dot hit-quality-good" />
                    <span>Good</span>
                    <strong>{pct(good)}%</strong>
                  </div>
                  <div className="hit-quality-legend-item">
                    <span className="hit-quality-dot hit-quality-ok" />
                    <span>OK</span>
                    <strong>{pct(ok)}%</strong>
                  </div>
                  <div className="hit-quality-legend-item">
                    <span className="hit-quality-dot hit-quality-miss" />
                    <span>Miss</span>
                    <strong>{pct(misses)}%</strong>
                  </div>
                </div>
                <p className="panel-copy">{total.toLocaleString()} notes judged</p>
              </>
            );
          })()}
        </article>
      </section>

      <section className="dashboard-meta-grid">
        <article className="panel top-songs-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Most Played</p>
              <h2>Top songs</h2>
            </div>
          </div>
          {topSongs.length === 0 ? (
            <p className="empty-state">No songs played yet.</p>
          ) : (
            <ol className="top-songs-list">
              {topSongs.map((song, index) => (
                <li key={song.songId} className="top-songs-item">
                  <span className="top-songs-rank">{index + 1}</span>
                  <span className="top-songs-title">{song.title}</span>
                  <span className="top-songs-plays">{song.playCount}×</span>
                  <span className="top-songs-accuracy">{Math.round(song.bestAccuracy)}%</span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="panel trouble-spots-global-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Needs Work</p>
              <h2>Trouble spots</h2>
            </div>
          </div>
          {troubleSpots.length === 0 ? (
            <p className="empty-state">No unresolved trouble spots.</p>
          ) : (
            <ul className="trouble-spots-global-list">
              {troubleSpots.map((spot) => (
                <li key={spot.id} className="trouble-spots-global-item">
                  <div className="trouble-spots-global-main">
                    <strong className="trouble-spots-global-song">{spot.songTitle}</strong>
                    <span className="trouble-spots-global-range">Measures {spot.measureStart}–{spot.measureEnd}</span>
                  </div>
                  <div className="trouble-spots-global-stats">
                    {spot.latestAccuracy !== null && (
                      <span className="trouble-spots-global-acc">{Math.round(spot.latestAccuracy)}%</span>
                    )}
                    {spot.struggleCount > 0 && (
                      <span className="trouble-spots-global-struggles">×{spot.struggleCount}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {weekComparison && (
        <section className="panel week-comparison-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Week over Week</p>
              <h2>This week vs last week</h2>
            </div>
          </div>
          <div className="week-comparison-grid">
            <div className="week-comparison-col">
              <p className="eyebrow">This Week</p>
              <div className="result-stat">
                <span>Practice Time</span>
                <strong>{weekComparison.thisWeek.practiceMinutes}m</strong>
              </div>
              <div className="result-stat">
                <span>Songs Played</span>
                <strong>{weekComparison.thisWeek.songsPlayed}</strong>
              </div>
              <div className="result-stat">
                <span>Avg Accuracy</span>
                <strong>{weekComparison.thisWeek.avgAccuracy !== null ? `${weekComparison.thisWeek.avgAccuracy}%` : '—'}</strong>
              </div>
            </div>
            <div className="week-comparison-col week-comparison-deltas">
              <p className="eyebrow">Change</p>
              <div className="result-stat">
                <span>Time</span>
                <strong>{weekComparisonDelta(weekComparison.thisWeek.practiceMinutes, weekComparison.lastWeek.practiceMinutes)}m</strong>
              </div>
              <div className="result-stat">
                <span>Songs</span>
                <strong>{weekComparisonDelta(weekComparison.thisWeek.songsPlayed, weekComparison.lastWeek.songsPlayed)}</strong>
              </div>
              <div className="result-stat">
                <span>Accuracy</span>
                <strong>
                  {weekComparison.thisWeek.avgAccuracy !== null && weekComparison.lastWeek.avgAccuracy !== null
                    ? (() => {
                        const diff = Math.round((weekComparison.thisWeek.avgAccuracy - weekComparison.lastWeek.avgAccuracy) * 10) / 10;
                        return diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff}%`;
                      })()
                    : '—'}
                </strong>
              </div>
            </div>
            <div className="week-comparison-col">
              <p className="eyebrow">Last Week</p>
              <div className="result-stat">
                <span>Practice Time</span>
                <strong>{weekComparison.lastWeek.practiceMinutes}m</strong>
              </div>
              <div className="result-stat">
                <span>Songs Played</span>
                <strong>{weekComparison.lastWeek.songsPlayed}</strong>
              </div>
              <div className="result-stat">
                <span>Avg Accuracy</span>
                <strong>{weekComparison.lastWeek.avgAccuracy !== null ? `${weekComparison.lastWeek.avgAccuracy}%` : '—'}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="dashboard-meta-grid">
        <article className="panel streak-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Practice Streaks</p>
              <h2>Consistency</h2>
            </div>
          </div>
          <div className="streak-values">
            <div>
              <span>Current</span>
              <strong>{streak.currentStreak} days</strong>
            </div>
            <div>
              <span>Longest</span>
              <strong>{streak.longestStreak} days</strong>
            </div>
          </div>
          <div className="streak-badges">
            <span className={streak.currentStreak >= 7 ? 'milestone-badge unlocked' : 'milestone-badge'}>7-day streak</span>
            <span className={streak.currentStreak >= 30 ? 'milestone-badge unlocked' : 'milestone-badge'}>30-day streak</span>
          </div>
          {streak.streakFreezes > 0 && (
            <p className="streak-freeze-info">
              {streak.streakFreezes} streak freeze{streak.streakFreezes !== 1 ? 's' : ''} available — used automatically if you miss a day
            </p>
          )}
        </article>

        <article className="panel achievements-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Achievements</p>
              <h2>Unlocked Milestones</h2>
            </div>
          </div>
          {unlockedAchievements.length === 0 ? (
            <p className="empty-state">No achievements unlocked yet.</p>
          ) : (
            <div className="achievement-grid">
              {ACHIEVEMENTS.filter((achievement) => unlockedAchievements.some((row) => row.id === achievement.id)).map((achievement) => (
                <article className="achievement-card unlocked" key={achievement.id}>
                  <span className="achievement-card-icon">{achievement.icon}</span>
                  <strong>{achievement.name}</strong>
                  <p className="panel-copy">{achievement.description}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
