import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../lib/achievements/achievementDefinitions';
import type { AddSongPayload, SaveGameResultPayload, SaveTheoryResultPayload } from '../shared/dbTypes';
import {
  AppDatabase,
  calculatePracticeStreak,
  resolveStreakFreezeConsumption,
  shouldAwardStreakFreezeForMilestone,
} from './database';

const tempDirs: string[] = [];
const songId = 'song-1';

async function makeDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lumakeys-db-'));
  tempDirs.push(dir);
  return join(dir, 'test.db');
}

function addSong(db: AppDatabase, id = songId, overrides: Partial<AddSongPayload> = {}): void {
  db.addSong({
    id,
    title: overrides.title ?? 'Etude',
    artist: overrides.artist ?? '',
    genre: overrides.genre ?? '',
    filePath: overrides.filePath ?? `/tmp/${id}.mid`,
    difficulty: overrides.difficulty ?? 2,
    durationSec: overrides.durationSec ?? 60,
    bpm: overrides.bpm ?? 120,
    noteCount: overrides.noteCount ?? 8,
    tags: overrides.tags ?? ['study'],
    folderId: overrides.folderId,
    trackAssignments: overrides.trackAssignments ?? { left: 'left', right: 'right' },
  });
}

function buildGameResult(overrides: Partial<SaveGameResultPayload> = {}): SaveGameResultPayload {
  return {
    songId,
    score: 800,
    accuracy: 82,
    maxCombo: 4,
    perfectHits: 4,
    goodHits: 2,
    okHits: 1,
    misses: 1,
    tempo: 1,
    mode: 'luma-keys',
    durationSec: 45,
    measureAccuracy: [],
    ...overrides,
  };
}

function saveResult(db: AppDatabase, id = songId): void {
  db.saveGameResult({
    songId: id,
    score: 800,
    accuracy: 82,
    maxCombo: 4,
    perfectHits: 4,
    goodHits: 2,
    okHits: 1,
    misses: 1,
    tempo: 1,
    mode: 'luma-keys',
    durationSec: 45,
    measureAccuracy: [],
  });
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function buildPracticeDates(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const [year, month, day] = startDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (let day = 0; day < days; day += 1) {
    dates.push([
      cursor.getUTCFullYear(),
      String(cursor.getUTCMonth() + 1).padStart(2, '0'),
      String(cursor.getUTCDate()).padStart(2, '0'),
    ].join('-'));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function toLocalDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toWeekStartDateString(date: Date): string {
  const cursor = new Date(date);
  const day = cursor.getDay();
  const diff = (day + 6) % 7;
  cursor.setDate(cursor.getDate() - diff);
  return toLocalDateString(cursor);
}

function buildTodayNoonFixture(): { date: Date; dateString: string; weekStart: string } {
  const dateString = toLocalDateString(new Date());
  const date = new Date(`${dateString}T12:00:00`);
  return { date, dateString, weekStart: toWeekStartDateString(date) };
}

describe('database streak freeze helpers', () => {
  it('earns one streak freeze at a 14 day milestone', () => {
    const currentStreak = calculatePracticeStreak(
      buildPracticeDates('2026-01-01', 14),
      new Date('2026-01-14T12:00:00.000Z'),
    ).currentStreak;

    expect(currentStreak).toBe(14);
    expect(shouldAwardStreakFreezeForMilestone(currentStreak)).toBe(true);
  });

  it('consumes a streak freeze for exactly one missed day', () => {
    const practiceDates = [...buildPracticeDates('2026-01-01', 14), '2026-01-16'];
    const consumption = resolveStreakFreezeConsumption(
      [...practiceDates].reverse(),
      new Date('2026-01-16T12:00:00.000Z'),
      1,
      [],
    );

    const streak = calculatePracticeStreak(
      practiceDates,
      new Date('2026-01-16T12:00:00.000Z'),
      consumption.usedDates,
    );

    expect(consumption.consumedDate).toBe('2026-01-15');
    expect(consumption.freezeCount).toBe(0);
    expect(streak.currentStreak).toBe(16);
  });

  it('does not consume a streak freeze for a gap larger than one missed day', () => {
    const practiceDates = [...buildPracticeDates('2026-01-01', 14), '2026-01-17'];
    const consumption = resolveStreakFreezeConsumption(
      [...practiceDates].reverse(),
      new Date('2026-01-17T12:00:00.000Z'),
      1,
      [],
    );

    const streak = calculatePracticeStreak(
      practiceDates,
      new Date('2026-01-17T12:00:00.000Z'),
      consumption.usedDates,
    );

    expect(consumption.consumedDate).toBeNull();
    expect(consumption.freezeCount).toBe(1);
    expect(streak.currentStreak).toBe(1);
  });
});

describe('AppDatabase result and progress fixtures', () => {
  it('keeps saved result side effects aligned across stats, progress, achievements, recommendations, and trouble spots', async () => {
    const fixture = buildTodayNoonFixture();
    vi.useFakeTimers();
    vi.setSystemTime(fixture.date);

    const db = new AppDatabase(await makeDbPath());
    addSong(db, songId, {
      title: 'Practice Song',
      genre: 'Classical',
      difficulty: 3,
      trackAssignments: { melody: 'right' },
    });
    addSong(db, 'challenge', { title: 'Challenge Study', genre: 'Jazz', difficulty: 5 });
    addSong(db, 'builder', { title: 'Coordination Builder', genre: 'Etude', difficulty: 3 });
    addSong(db, 'genre-pick', { title: 'Classical Echo', genre: 'Classical', difficulty: 1 });
    db.setSetting('practice', 'dailyGoalMinutes', '1');
    db.setSetting('song-goal', songId, '90');

    const firstOutcome = db.saveGameResult(buildGameResult({
      score: 680,
      accuracy: 68,
      maxCombo: 3,
      perfectHits: 2,
      goodHits: 1,
      okHits: 1,
      misses: 2,
      durationSec: 30,
      measureAccuracy: [{ measure: 2, accuracy: 52 }],
    }));
    const secondOutcome = db.saveGameResult(buildGameResult({
      score: 1200,
      accuracy: 100,
      maxCombo: 8,
      perfectHits: 8,
      goodHits: 0,
      okHits: 0,
      misses: 0,
      durationSec: 45,
      measureAccuracy: [{ measure: 2, accuracy: 88 }],
    }));

    expect(firstOutcome).toMatchObject({
      unlockedAchievementIds: ['first-song'],
      dailyGoalReached: false,
      songGoalReached: false,
    });
    expect(secondOutcome).toMatchObject({
      unlockedAchievementIds: ['perfect-score'],
      dailyGoalReached: true,
      songGoalReached: true,
    });

    expect(db.getSong(songId)?.timesPlayed).toBe(2);
    expect(db.getUserStats(songId)).toMatchObject({
      playCount: 2,
      bestScore: 1200,
      averageScore: 940,
      bestAccuracy: 100,
      totalPracticeTimeSec: 75,
    });
    expect(
      db.getAllAchievements()
        .filter((achievement) => achievement.unlockedAt !== null)
        .map((achievement) => achievement.id),
    ).toEqual(['first-song', 'perfect-score']);

    const progress = db.getProgressStats(fixture.dateString, fixture.dateString);
    expect(progress.practiceTimeByDay).toEqual([{ date: fixture.dateString, minutes: 1.3 }]);
    expect(progress.songsPlayedByWeek).toEqual([{ weekStart: fixture.weekStart, count: 2 }]);
    expect(progress.accuracyTrend).toEqual([{ date: fixture.dateString, avgAccuracy: 84 }]);
    expect(progress.hitQuality).toEqual({ perfect: 10, good: 1, ok: 1, misses: 2 });
    expect(progress.totalStats).toMatchObject({
      totalSongs: 4,
      songsMastered: 1,
      totalPracticeTimeSec: 75,
      favoriteGenre: 'Classical',
    });

    expect(db.getProgressTopSongs()).toEqual([
      {
        songId,
        title: 'Practice Song',
        playCount: 2,
        bestAccuracy: 100,
        totalPracticeTimeSec: 75,
      },
    ]);
    expect(db.getAllUnresolvedTroubleSpots()).toMatchObject([
      {
        songId,
        songTitle: 'Practice Song',
        measureStart: 2,
        measureEnd: 2,
        struggleCount: 1,
        lowestAccuracy: 52,
        latestAccuracy: 88,
      },
    ]);

    const recommendations = db.getRecommendations();
    expect(recommendations.nextChallenge[0]?.song.id).toBe('challenge');
    expect(recommendations.skillBuilder[0]?.song.id).toBe('builder');
    expect(recommendations.youMightLike[0]?.song.id).toBe('genre-pick');
    expect(recommendations.revisit[0]?.song.id).toBe(songId);

    db.close();
  });

  it('keeps theory payloads, stats, practice progress, and result filters aligned', async () => {
    const fixture = buildTodayNoonFixture();
    vi.useFakeTimers();
    vi.setSystemTime(fixture.date);

    const db = new AppDatabase(await makeDbPath());
    const results: SaveTheoryResultPayload[] = [
      {
        type: 'quiz',
        score: 8,
        totalQuestions: 10,
        accuracy: 80,
        details: { quizType: 'mixed', answers: ['C', 'G'] },
      },
      {
        type: 'interval-trainer',
        score: 9,
        totalQuestions: 10,
        accuracy: 90,
        details: { difficulty: 'medium', maxStreak: 5 },
      },
      {
        type: 'scale-practice',
        score: 7,
        totalQuestions: 8,
        accuracy: 87.5,
        details: { root: 0, scaleName: 'Major', direction: 'ascending', octaves: 1 },
      },
    ];

    for (const payload of results) {
      expect(db.saveTheoryResult(payload)).toMatchObject({
        dailyGoalReached: false,
        songGoalReached: false,
      });
    }

    expect(db.getTheoryResults('quiz')).toMatchObject([
      {
        type: 'quiz',
        score: 8,
        totalQuestions: 10,
        accuracy: 80,
        details: { quizType: 'mixed', answers: ['C', 'G'] },
      },
    ]);
    expect(db.getTheoryStats('interval-trainer')).toMatchObject({
      type: 'interval-trainer',
      sessionCount: 1,
      bestScore: 9,
      averageAccuracy: 90,
    });
    expect(db.getTheoryStats('scale-practice')).toMatchObject({
      type: 'scale-practice',
      sessionCount: 1,
      bestScore: 7,
      averageAccuracy: 87.5,
    });
    expect(db.getPracticeDays(fixture.dateString, fixture.dateString)).toEqual([
      {
        date: fixture.dateString,
        totalPracticeTimeSec: 0,
        songsPlayed: 0,
        theorySessions: 3,
      },
    ]);
    expect(db.getProgressStats(fixture.dateString, fixture.dateString).theorySessionsByDay).toEqual([
      { date: fixture.dateString, sessions: 3 },
    ]);

    db.close();
  });
});

describe('AppDatabase initialization and migrations', () => {
  it('initializes a fresh database with default settings and achievement rows', async () => {
    const db = new AppDatabase(await makeDbPath());

    expect(db.getAllSongs()).toEqual([]);
    expect(db.getSetting('fingering', 'handSize')).toBe('medium');
    expect(db.getAllAchievements()).toHaveLength(ACHIEVEMENTS.length);
    expect(db.getAllAchievements().every((achievement) => achievement.unlockedAt === null)).toBe(true);

    db.close();
  });

  it('adds songs.folder_id when opening a legacy songs table', async () => {
    const dbPath = await makeDbPath();
    const legacyDb = new Database(dbPath);
    legacyDb.exec(`
      CREATE TABLE songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL DEFAULT '',
        genre TEXT NOT NULL DEFAULT '',
        file_path TEXT NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 0,
        duration_sec REAL NOT NULL DEFAULT 0,
        bpm REAL NOT NULL DEFAULT 0,
        note_count INTEGER NOT NULL DEFAULT 0,
        date_added TEXT NOT NULL DEFAULT (datetime('now')),
        times_played INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL DEFAULT '[]',
        is_favorite INTEGER NOT NULL DEFAULT 0,
        track_assignments TEXT NOT NULL DEFAULT '{}'
      );
    `);
    legacyDb
      .prepare(`
        INSERT INTO songs
          (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments)
        VALUES
          (@id, @title, '', '', @filePath, 1, 10, 120, 4, '[]', '{}')
      `)
      .run({ id: songId, title: 'Legacy Song', filePath: '/tmp/legacy.mid' });
    legacyDb.close();

    const db = new AppDatabase(dbPath);
    const folder = db.createFolder('Studies');
    db.moveSongToFolder(songId, folder.id);
    expect(db.getSong(songId)?.folderId).toBe(folder.id);
    db.close();

    const migratedDb = new Database(dbPath);
    const columns = migratedDb.prepare('PRAGMA table_info(songs)').all() as Array<{ name: string }>;
    migratedDb.close();
    expect(columns.map((column) => column.name)).toContain('folder_id');
  });

  it('converts legacy piano-hero and normal result modes to luma-keys on init', async () => {
    const dbPath = await makeDbPath();
    const legacyDb = new Database(dbPath);
    legacyDb.exec(`
      CREATE TABLE songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL DEFAULT '',
        genre TEXT NOT NULL DEFAULT '',
        file_path TEXT NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 0,
        duration_sec REAL NOT NULL DEFAULT 0,
        bpm REAL NOT NULL DEFAULT 0,
        note_count INTEGER NOT NULL DEFAULT 0,
        date_added TEXT NOT NULL DEFAULT (datetime('now')),
        times_played INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL DEFAULT '[]',
        is_favorite INTEGER NOT NULL DEFAULT 0,
        track_assignments TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE game_results (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        max_combo INTEGER NOT NULL,
        perfect_hits INTEGER NOT NULL DEFAULT 0,
        good_hits INTEGER NOT NULL DEFAULT 0,
        ok_hits INTEGER NOT NULL DEFAULT 0,
        misses INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        tempo REAL NOT NULL DEFAULT 1.0,
        mode TEXT NOT NULL DEFAULT 'piano-hero',
        duration_sec REAL NOT NULL DEFAULT 0
      );
    `);
    legacyDb
      .prepare(`INSERT INTO songs (id, title, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments)
                VALUES (?, 'Legacy Song', '', 1, 10, 120, 4, '[]', '{}')`)
      .run(songId);
    const insertResult = legacyDb.prepare(`
      INSERT INTO game_results
        (id, song_id, score, accuracy, max_combo, timestamp, tempo, mode, duration_sec)
      VALUES (?, ?, 100, 95, 10, datetime('now'), 1.0, ?, 30)
    `);
    insertResult.run('r-piano-hero', songId, 'piano-hero');
    insertResult.run('r-normal', songId, 'normal');
    insertResult.run('r-luma-keys', songId, 'luma-keys');
    legacyDb.close();

    const db = new AppDatabase(dbPath);
    expect(db.getGameResults(songId).map((result) => result.mode)).toEqual([
      'luma-keys',
      'luma-keys',
      'luma-keys',
    ]);
    db.close();
  });
});

describe('AppDatabase mutation payloads and resets', () => {
  it('applies every allowed song update field', async () => {
    const db = new AppDatabase(await makeDbPath());
    addSong(db);
    const folder = db.createFolder('Favorites');

    db.updateSong(songId, {
      title: 'Updated',
      artist: 'Ada',
      genre: 'Jazz',
      filePath: '/tmp/updated.mid',
      difficulty: 7,
      durationSec: 140,
      bpm: 98,
      noteCount: 55,
      tags: ['updated', 'practice'],
      isFavorite: true,
      folderId: folder.id,
      trackAssignments: { left: 'left', right: 'right' },
    });

    const song = db.getSong(songId)!;
    expect(song).toMatchObject({
      title: 'Updated',
      artist: 'Ada',
      genre: 'Jazz',
      filePath: '/tmp/updated.mid',
      difficulty: 7,
      durationSec: 140,
      bpm: 98,
      noteCount: 55,
      tags: ['updated', 'practice'],
      isFavorite: true,
      folderId: folder.id,
      trackAssignments: { left: 'left', right: 'right' },
    });

    db.close();
  });

  it('applies every allowed trouble spot update field', async () => {
    const db = new AppDatabase(await makeDbPath());
    addSong(db);
    db.saveGameResult({
      songId,
      score: 300,
      accuracy: 60,
      maxCombo: 2,
      perfectHits: 1,
      goodHits: 1,
      okHits: 0,
      misses: 2,
      tempo: 1,
      mode: 'learning',
      durationSec: 30,
      measureAccuracy: [{ measure: 4, accuracy: 52 }],
    });

    const spotId = db.getTroubleSpots(songId)[0].id;
    db.updateTroubleSpot(spotId, {
      measureStart: 2,
      measureEnd: 5,
      firstDetected: '2026-01-01T00:00:00.000Z',
      lastPracticed: null,
      resolutionCount: 3,
      isResolved: true,
    });

    expect(db.getTroubleSpots(songId)[0]).toMatchObject({
      measureStart: 2,
      measureEnd: 5,
      firstDetected: '2026-01-01T00:00:00.000Z',
      lastPracticed: null,
      resolutionCount: 3,
      isResolved: true,
    });

    db.close();
  });

  it('resets learning progress while preserving library data and durable settings', async () => {
    const db = new AppDatabase(await makeDbPath());
    addSong(db);
    db.saveCustomFingering(songId, 0, 3, 'right');
    db.setSetting('learning', 'lesson-a', 'complete');
    db.setSetting('progress', 'streakFreezes', '2');
    db.setSetting('progress', 'streakFreezeUsedDates', '["2026-01-01"]');
    db.setSetting('progress', 'streakFreezeMilestone14', '1');
    db.setSetting('input', 'mode', 'midi');
    saveResult(db);
    db.unlockAchievement(ACHIEVEMENTS[0].id);

    db.resetLearningProgress();

    expect(db.getSong(songId)).toMatchObject({ id: songId, timesPlayed: 0 });
    expect(db.getCustomFingerings(songId)).toHaveLength(1);
    expect(db.getGameResults(songId)).toEqual([]);
    expect(db.getPracticeDays('2000-01-01', '2099-12-31')).toEqual([]);
    expect(db.getSetting('learning', 'lesson-a')).toBeNull();
    expect(db.getSetting('progress', 'streakFreezes')).toBeNull();
    expect(db.getSetting('progress', 'streakFreezeUsedDates')).toBeNull();
    expect(db.getSetting('progress', 'streakFreezeMilestone14')).toBeNull();
    expect(db.getSetting('input', 'mode')).toBe('midi');
    expect(db.getAllAchievements()).toHaveLength(ACHIEVEMENTS.length);
    expect(db.getAllAchievements().every((achievement) => achievement.unlockedAt === null)).toBe(true);

    db.close();
  });

  it('stores stable fingering identities alongside ambiguous legacy rows', async () => {
    const db = new AppDatabase(await makeDbPath());
    addSong(db);
    db.saveCustomFingering(songId, 0, 3, 'right');
    db.saveCustomFingering(songId, -1, 5, 'right', 'source-note-2');

    expect(db.getCustomFingerings(songId)).toEqual([
      { songId, noteIndex: -1, noteId: 'source-note-2', finger: 5, hand: 'right' },
      { songId, noteIndex: 0, finger: 3, hand: 'right' },
    ]);
    db.close();
  });

  it('resets all user data and reseeds locked achievements', async () => {
    const db = new AppDatabase(await makeDbPath());
    addSong(db);
    const folder = db.createFolder('Studies');
    db.moveSongToFolder(songId, folder.id);
    const playlist = db.createPlaylist('Warmups');
    db.addSongToPlaylist(playlist.id, songId);
    db.saveCustomFingering(songId, 0, 2, 'left');
    db.setSetting('input', 'mode', 'keyboard');
    saveResult(db);
    db.unlockAchievement(ACHIEVEMENTS[0].id);

    db.resetUserData();

    expect(db.getAllSongs()).toEqual([]);
    expect(db.getAllFolders()).toEqual([]);
    expect(db.getAllPlaylists()).toEqual([]);
    expect(db.getCustomFingerings(songId)).toEqual([]);
    expect(db.getSetting('input', 'mode')).toBeNull();
    expect(db.getPracticeDays('2000-01-01', '2099-12-31')).toEqual([]);
    expect(db.getAllAchievements()).toHaveLength(ACHIEVEMENTS.length);
    expect(db.getAllAchievements().every((achievement) => achievement.unlockedAt === null)).toBe(true);

    db.close();
  });
});
