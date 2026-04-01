import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { TrackAssignment } from '../lib/game/types';
import type {
  AddSongPayload,
  GameResultRow,
  SaveGameResultPayload,
  SongRow,
  UserStatsRow,
} from '../shared/dbTypes';

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS songs (
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

      CREATE TABLE IF NOT EXISTS user_stats (
        song_id TEXT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
        play_count INTEGER NOT NULL DEFAULT 0,
        best_score INTEGER NOT NULL DEFAULT 0,
        average_score REAL NOT NULL DEFAULT 0,
        best_accuracy REAL NOT NULL DEFAULT 0,
        last_played TEXT,
        total_practice_time_sec REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS game_results (
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

      CREATE TABLE IF NOT EXISTS settings (
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (category, key)
      );

      CREATE INDEX IF NOT EXISTS idx_game_results_song_id ON game_results(song_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_timestamp ON game_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_songs_date_added ON songs(date_added);
      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title COLLATE NOCASE);
    `);

    this.db.prepare(`UPDATE songs SET tags = '[]' WHERE tags = '' OR tags IS NULL`).run();
    this.db.prepare(`UPDATE songs SET track_assignments = '{}' WHERE track_assignments = '' OR track_assignments IS NULL`).run();
    this.db.prepare(`UPDATE game_results SET mode = 'piano-hero' WHERE mode = 'normal' OR mode = '' OR mode IS NULL`).run();
  }

  migrateFromJson(userDataPath: string): void {
    const jsonPath = join(userDataPath, 'song-metadata.json');
    if (!existsSync(jsonPath)) {
      return;
    }

    const count = (this.db.prepare('SELECT COUNT(*) as n FROM songs').get() as { n: number }).n;
    if (count > 0) {
      return;
    }

    try {
      const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
        songs: Record<
          string,
          { title: string; sourcePath?: string; trackAssignments: Record<string, string>; updatedAt: string }
        >;
      };
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO songs (id, title, file_path, track_assignments, date_added, tags)
        VALUES (@id, @title, @filePath, @trackAssignments, @dateAdded, '[]')
      `);
      const insertMany = this.db.transaction(
        (
          entries: Array<{
            id: string;
            title: string;
            filePath: string;
            trackAssignments: string;
            dateAdded: string;
          }>,
        ) => {
          for (const entry of entries) {
            insert.run(entry);
          }
        },
      );

      const entries = Object.entries(raw.songs).map(([id, meta]) => ({
        id,
        title: meta.title,
        filePath: meta.sourcePath ?? '',
        trackAssignments: JSON.stringify(meta.trackAssignments),
        dateAdded: meta.updatedAt,
      }));

      insertMany(entries);
      renameSync(jsonPath, jsonPath + '.migrated');
    } catch {
      // Migration failure is non-fatal.
    }
  }

  getAllSongs(): SongRow[] {
    const rows = this.db.prepare('SELECT * FROM songs ORDER BY date_added DESC').all() as Record<string, unknown>[];
    return rows.map(rowToSong);
  }

  getSong(id: string): SongRow | null {
    const row = this.db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToSong(row) : null;
  }

  addSong(payload: AddSongPayload): SongRow {
    this.db
      .prepare(`
        INSERT OR IGNORE INTO songs
          (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments)
        VALUES
          (@id, @title, @artist, @genre, @filePath, @difficulty, @durationSec, @bpm, @noteCount, @tags, @trackAssignments)
      `)
      .run({
        id: payload.id,
        title: payload.title,
        artist: payload.artist,
        genre: payload.genre,
        filePath: payload.filePath,
        difficulty: payload.difficulty,
        durationSec: payload.durationSec,
        bpm: payload.bpm,
        noteCount: payload.noteCount,
        tags: JSON.stringify(payload.tags),
        trackAssignments: JSON.stringify(payload.trackAssignments),
      });

    return this.getSong(payload.id)!;
  }

  updateSong(id: string, updates: Partial<Omit<SongRow, 'id' | 'dateAdded'>>): void {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (updates.title !== undefined) {
      fields.push('title = @title');
      params.title = updates.title;
    }
    if (updates.artist !== undefined) {
      fields.push('artist = @artist');
      params.artist = updates.artist;
    }
    if (updates.genre !== undefined) {
      fields.push('genre = @genre');
      params.genre = updates.genre;
    }
    if (updates.filePath !== undefined) {
      fields.push('file_path = @filePath');
      params.filePath = updates.filePath;
    }
    if (updates.difficulty !== undefined) {
      fields.push('difficulty = @difficulty');
      params.difficulty = updates.difficulty;
    }
    if (updates.durationSec !== undefined) {
      fields.push('duration_sec = @durationSec');
      params.durationSec = updates.durationSec;
    }
    if (updates.bpm !== undefined) {
      fields.push('bpm = @bpm');
      params.bpm = updates.bpm;
    }
    if (updates.noteCount !== undefined) {
      fields.push('note_count = @noteCount');
      params.noteCount = updates.noteCount;
    }
    if (updates.tags !== undefined) {
      fields.push('tags = @tags');
      params.tags = JSON.stringify(updates.tags);
    }
    if (updates.isFavorite !== undefined) {
      fields.push('is_favorite = @isFavorite');
      params.isFavorite = updates.isFavorite ? 1 : 0;
    }
    if (updates.trackAssignments !== undefined) {
      fields.push('track_assignments = @trackAssignments');
      params.trackAssignments = JSON.stringify(updates.trackAssignments);
    }

    if (fields.length === 0) {
      return;
    }

    this.db.prepare(`UPDATE songs SET ${fields.join(', ')} WHERE id = @id`).run(params);
  }

  deleteSong(id: string): void {
    this.db.prepare('DELETE FROM songs WHERE id = ?').run(id);
  }

  toggleFavorite(id: string): void {
    this.db.prepare('UPDATE songs SET is_favorite = 1 - is_favorite WHERE id = ?').run(id);
  }

  saveGameResult(payload: SaveGameResultPayload): void {
    const id = randomUUID();
    const now = new Date().toISOString();

    const saveTransaction = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO game_results
            (id, song_id, score, accuracy, max_combo, perfect_hits, good_hits, ok_hits,
             misses, timestamp, tempo, mode, duration_sec)
          VALUES
            (@id, @songId, @score, @accuracy, @maxCombo, @perfectHits, @goodHits, @okHits,
             @misses, @timestamp, @tempo, @mode, @durationSec)
        `)
        .run({
          id,
          songId: payload.songId,
          score: payload.score,
          accuracy: payload.accuracy,
          maxCombo: payload.maxCombo,
          perfectHits: payload.perfectHits,
          goodHits: payload.goodHits,
          okHits: payload.okHits,
          misses: payload.misses,
          timestamp: now,
          tempo: payload.tempo,
          mode: payload.mode,
          durationSec: payload.durationSec,
        });

      const existing = this.db
        .prepare('SELECT * FROM user_stats WHERE song_id = ?')
        .get(payload.songId) as Record<string, unknown> | undefined;

      if (!existing) {
        this.db
          .prepare(`
            INSERT INTO user_stats
              (song_id, play_count, best_score, average_score, best_accuracy, last_played, total_practice_time_sec)
            VALUES
              (@songId, 1, @score, @score, @accuracy, @now, @durationSec)
          `)
          .run({
            songId: payload.songId,
            score: payload.score,
            accuracy: payload.accuracy,
            now,
            durationSec: payload.durationSec,
          });
      } else {
        const playCount = (existing.play_count as number) + 1;
        const bestScore = Math.max(existing.best_score as number, payload.score);
        const bestAccuracy = Math.max(existing.best_accuracy as number, payload.accuracy);
        const prevAvg = existing.average_score as number;
        const prevCount = existing.play_count as number;
        const newAvg = (prevAvg * prevCount + payload.score) / playCount;
        const totalTime = (existing.total_practice_time_sec as number) + payload.durationSec;

        this.db
          .prepare(`
            UPDATE user_stats SET
              play_count = @playCount,
              best_score = @bestScore,
              average_score = @newAvg,
              best_accuracy = @bestAccuracy,
              last_played = @now,
              total_practice_time_sec = @totalTime
            WHERE song_id = @songId
          `)
          .run({ playCount, bestScore, newAvg, bestAccuracy, now, totalTime, songId: payload.songId });
      }

      this.db.prepare('UPDATE songs SET times_played = times_played + 1 WHERE id = ?').run(payload.songId);
    });

    saveTransaction();
  }

  getGameResults(songId: string): GameResultRow[] {
    const rows = this.db
      .prepare('SELECT * FROM game_results WHERE song_id = ? ORDER BY timestamp DESC')
      .all(songId) as Record<string, unknown>[];
    return rows.map(rowToGameResult);
  }

  getUserStats(songId: string): UserStatsRow | null {
    const row = this.db
      .prepare('SELECT * FROM user_stats WHERE song_id = ?')
      .get(songId) as Record<string, unknown> | undefined;
    return row ? rowToUserStats(row) : null;
  }

  getSetting(category: string, key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE category = ? AND key = ?')
      .get(category, key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(category: string, key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)')
      .run(category, key, value);
  }

  close(): void {
    this.db.close();
  }
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === 'string');
    }
  } catch {
    // Fall through to comma split for legacy rows.
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTrackAssignments(value: unknown): Record<string, TrackAssignment> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, TrackAssignment>;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, TrackAssignment>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function rowToSong(row: Record<string, unknown>): SongRow {
  return {
    id: row.id as string,
    title: row.title as string,
    artist: row.artist as string,
    genre: row.genre as string,
    filePath: row.file_path as string,
    difficulty: row.difficulty as number,
    durationSec: row.duration_sec as number,
    bpm: row.bpm as number,
    noteCount: row.note_count as number,
    dateAdded: row.date_added as string,
    timesPlayed: row.times_played as number,
    tags: parseTags(row.tags),
    isFavorite: (row.is_favorite as number) === 1,
    trackAssignments: parseTrackAssignments(row.track_assignments),
  };
}

function rowToGameResult(row: Record<string, unknown>): GameResultRow {
  return {
    id: row.id as string,
    songId: row.song_id as string,
    score: row.score as number,
    accuracy: row.accuracy as number,
    maxCombo: row.max_combo as number,
    perfectHits: row.perfect_hits as number,
    goodHits: row.good_hits as number,
    okHits: row.ok_hits as number,
    misses: row.misses as number,
    timestamp: row.timestamp as string,
    tempo: row.tempo as number,
    mode: row.mode as GameResultRow['mode'],
    durationSec: row.duration_sec as number,
  };
}

function rowToUserStats(row: Record<string, unknown>): UserStatsRow {
  return {
    songId: row.song_id as string,
    playCount: row.play_count as number,
    bestScore: row.best_score as number,
    averageScore: row.average_score as number,
    bestAccuracy: row.best_accuracy as number,
    lastPlayed: row.last_played as string | null,
    totalPracticeTimeSec: row.total_practice_time_sec as number,
  };
}
