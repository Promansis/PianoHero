import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS } from '../../lib/achievements/achievementDefinitions';
import type { AchievementRow, ProgressStatsResult, PracticeStreak } from '../../shared/dbTypes';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';

interface ProgressDashboardScreenProps {
  onBack: () => void;
}

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

export function ProgressDashboardScreen({ onBack }: ProgressDashboardScreenProps) {
  const [stats, setStats] = useState<ProgressStatsResult | null>(null);
  const [streak, setStreak] = useState<PracticeStreak | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
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
        const [nextStats, nextStreak, nextAchievements] = await Promise.all([
          window.appBridge.getProgressStats(fromDate, toDate),
          window.appBridge.getPracticeStreak(),
          window.appBridge.getAllAchievements(),
        ]);

        setStats(nextStats);
        setStreak(nextStreak);
        setAchievements(nextAchievements);
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
          <button className="secondary-button" onClick={onBack}>
            Back to Library
          </button>
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
          <button className="secondary-button" onClick={onBack}>
            Back to Library
          </button>
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
        <button className="secondary-button" onClick={onBack}>
          Back to Library
        </button>
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

      <section className="dashboard-chart-grid">
        <article className="panel chart-panel">
          <LineChart
            title="Practice Time (Last 30 Days)"
            color="#1f3d7a"
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
            color="#bf5b44"
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
            color="#40b56a"
            data={stats.accuracyTrend.map((entry) => ({
              label: entry.date.slice(5),
              value: entry.avgAccuracy,
            }))}
            maxValue={100}
            emptyLabel="No scored song sessions yet."
          />
        </article>
      </section>

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
