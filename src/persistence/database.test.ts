import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../lib/achievements/achievementDefinitions';
import {
  AppDatabase,
  calculatePracticeStreak,
  resolveStreakFreezeConsumption,
  shouldAwardStreakFreezeForMilestone,
} from './database';

const tempDirs: string[] = [];
const songId = 'song-1';

async function makeDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pianohero-db-'));
  tempDirs.push(dir);
  return join(dir, 'test.db');
}

function addSong(db: AppDatabase, id = songId): void {
  db.addSong({
    id,
    title: 'Etude',
    artist: '',
    genre: '',
    filePath: `/tmp/${id}.mid`,
    difficulty: 2,
    durationSec: 60,
    bpm: 120,
    noteCount: 8,
    tags: ['study'],
    trackAssignments: { piano: 'both' },
  });
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
    mode: 'piano-hero',
    durationSec: 45,
    measureAccuracy: [],
  });
}

afterEach(async () => {
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
