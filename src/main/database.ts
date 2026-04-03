import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { getUnlockableAchievementIds, type AchievementMetrics } from '../lib/achievements/achievementChecker';
import { ACHIEVEMENTS } from '../lib/achievements/achievementDefinitions';
import type { Hand, TrackAssignment } from '../lib/game/types';
import { generateRecommendations } from '../lib/recommendations/recommendationEngine';
import type {
  AddSongPayload,
  AchievementRow,
  FingeringRow,
  FolderRow,
  GameResultRow,
  LibraryBackup,
  LibraryImportResult,
  MeasureAccuracyHistoryRow,
  PlaylistRow,
  PracticeDayRow,
  PracticeStreak,
  ProgressStatsResult,
  RecommendationResult,
  SaveResultOutcome,
  SaveGameResultPayload,
  SaveTheoryResultPayload,
  SettingRow,
  SongRow,
  TheoryResultRow,
  TheoryStatsRow,
  TroubleSpotRow,
  UserStatsRow,
} from '../shared/dbTypes';

type DbRow = Record<string, unknown>;

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

      CREATE TABLE IF NOT EXISTS theory_results (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('quiz', 'interval-trainer', 'scale-practice')),
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (category, key)
      );

      CREATE TABLE IF NOT EXISTS fingerings (
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        note_index INTEGER NOT NULL,
        finger INTEGER NOT NULL CHECK(finger BETWEEN 1 AND 5),
        hand TEXT NOT NULL CHECK(hand IN ('left', 'right')),
        PRIMARY KEY (song_id, note_index)
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (playlist_id, song_id)
      );

      CREATE TABLE IF NOT EXISTS practice_days (
        date TEXT PRIMARY KEY,
        total_practice_time_sec REAL NOT NULL DEFAULT 0,
        songs_played INTEGER NOT NULL DEFAULT 0,
        theory_sessions INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        unlocked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS trouble_spots (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        measure_start INTEGER NOT NULL,
        measure_end INTEGER NOT NULL,
        first_detected TEXT NOT NULL,
        last_practiced TEXT,
        resolution_count INTEGER NOT NULL DEFAULT 0,
        is_resolved INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS measure_accuracy_history (
        id TEXT PRIMARY KEY,
        game_result_id TEXT NOT NULL REFERENCES game_results(id) ON DELETE CASCADE,
        measure INTEGER NOT NULL,
        accuracy REAL NOT NULL
      );
    `);

    this.ensureSongFolderColumn();

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_game_results_song_id ON game_results(song_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_timestamp ON game_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_theory_results_type ON theory_results(type);
      CREATE INDEX IF NOT EXISTS idx_theory_results_timestamp ON theory_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_songs_date_added ON songs(date_added);
      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_songs_folder_id ON songs(folder_id);
      CREATE INDEX IF NOT EXISTS idx_game_results_song_timestamp ON game_results(song_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_user_stats_last_played ON user_stats(last_played DESC);
      CREATE INDEX IF NOT EXISTS idx_practice_days_date ON practice_days(date DESC);
      CREATE INDEX IF NOT EXISTS idx_trouble_spots_song ON trouble_spots(song_id, is_resolved);
      CREATE INDEX IF NOT EXISTS idx_measure_accuracy_history_game_result ON measure_accuracy_history(game_result_id, measure);
      CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(sort_order, name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name COLLATE NOCASE);
    `);

    this.db.prepare(`UPDATE songs SET tags = '[]' WHERE tags = '' OR tags IS NULL`).run();
    this.db.prepare(`UPDATE songs SET track_assignments = '{}' WHERE track_assignments = '' OR track_assignments IS NULL`).run();
    this.db.prepare(`UPDATE game_results SET mode = 'piano-hero' WHERE mode = 'normal' OR mode = '' OR mode IS NULL`).run();
    this.db
      .prepare(`INSERT OR IGNORE INTO settings (category, key, value) VALUES ('fingering', 'handSize', 'medium')`)
      .run();
    this.seedAchievements();
  }

  private ensureSongFolderColumn(): void {
    const columns = this.db.prepare(`PRAGMA table_info(songs)`).all() as Array<{ name: string }>;
    const hasFolderId = columns.some((column) => column.name === 'folder_id');
    if (!hasFolderId) {
      this.db.prepare(`ALTER TABLE songs ADD COLUMN folder_id TEXT`).run();
    }
  }

  private seedAchievements(): void {
    const insert = this.db.prepare('INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, NULL)');
    for (const achievement of ACHIEVEMENTS) {
      insert.run(achievement.id);
    }
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
    const rows = this.db.prepare('SELECT * FROM songs ORDER BY date_added DESC').all() as DbRow[];
    return rows.map(rowToSong);
  }

  getSong(id: string): SongRow | null {
    const row = this.db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as DbRow | undefined;
    return row ? rowToSong(row) : null;
  }

  addSong(payload: AddSongPayload): SongRow {
    this.db
      .prepare(`
        INSERT OR IGNORE INTO songs
          (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments, folder_id)
        VALUES
          (@id, @title, @artist, @genre, @filePath, @difficulty, @durationSec, @bpm, @noteCount, @tags, @trackAssignments, @folderId)
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
        folderId: payload.folderId ?? null,
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
    if (updates.folderId !== undefined) {
      fields.push('folder_id = @folderId');
      params.folderId = updates.folderId;
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

  bulkDeleteSongs(songIds: string[]): void {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }

    const removeMany = this.db.transaction((nextIds: string[]) => {
      const stmt = this.db.prepare('DELETE FROM songs WHERE id = ?');
      for (const songId of nextIds) {
        stmt.run(songId);
      }
    });
    removeMany(ids);
  }

  toggleFavorite(id: string): void {
    this.db.prepare('UPDATE songs SET is_favorite = 1 - is_favorite WHERE id = ?').run(id);
  }

  moveSongToFolder(songId: string, folderId: string | null): void {
    this.db.prepare('UPDATE songs SET folder_id = ? WHERE id = ?').run(folderId, songId);
  }

  bulkMoveSongsToFolder(songIds: string[], folderId: string | null): void {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }

    const moveMany = this.db.transaction((nextIds: string[]) => {
      const stmt = this.db.prepare('UPDATE songs SET folder_id = ? WHERE id = ?');
      for (const songId of nextIds) {
        stmt.run(folderId, songId);
      }
    });
    moveMany(ids);
  }

  bulkAddTag(songIds: string[], tag: string): void {
    this.bulkUpdateTags(songIds, (tags) => {
      const normalizedTag = normalizeTag(tag);
      return normalizedTag && !tags.includes(normalizedTag) ? [...tags, normalizedTag] : tags;
    });
  }

  bulkRemoveTag(songIds: string[], tag: string): void {
    this.bulkUpdateTags(songIds, (tags) => tags.filter((entry) => entry !== normalizeTag(tag)));
  }

  private bulkUpdateTags(songIds: string[], updater: (tags: string[]) => string[]): void {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }

    const updateMany = this.db.transaction((nextIds: string[]) => {
      const selectStmt = this.db.prepare('SELECT id, tags FROM songs WHERE id = ?');
      const updateStmt = this.db.prepare('UPDATE songs SET tags = ? WHERE id = ?');
      for (const songId of nextIds) {
        const row = selectStmt.get(songId) as { id: string; tags: unknown } | undefined;
        if (!row) {
          continue;
        }
        updateStmt.run(JSON.stringify(updater(parseTags(row.tags))), songId);
      }
    });
    updateMany(ids);
  }

  getCustomFingerings(songId: string): FingeringRow[] {
    const rows = this.db
      .prepare('SELECT * FROM fingerings WHERE song_id = ? ORDER BY note_index ASC')
      .all(songId) as DbRow[];
    return rows.map(rowToFingering);
  }

  saveCustomFingering(songId: string, noteIndex: number, finger: number, hand: Hand): void {
    this.db
      .prepare(`
        INSERT INTO fingerings (song_id, note_index, finger, hand)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(song_id, note_index) DO UPDATE SET finger = excluded.finger, hand = excluded.hand
      `)
      .run(songId, noteIndex, finger, hand);
  }

  clearCustomFingerings(songId: string): void {
    this.db.prepare('DELETE FROM fingerings WHERE song_id = ?').run(songId);
  }

  getAllFolders(): FolderRow[] {
    const rows = this.db.prepare('SELECT * FROM folders ORDER BY sort_order ASC, name COLLATE NOCASE ASC').all() as DbRow[];
    return rows.map(rowToFolder);
  }

  createFolder(name: string): FolderRow {
    const id = randomUUID();
    const sortOrder = this.getNextSortOrder('folders');
    this.db.prepare('INSERT INTO folders (id, name, sort_order) VALUES (?, ?, ?)').run(id, name.trim(), sortOrder);
    return this.getFolder(id)!;
  }

  renameFolder(folderId: string, name: string): void {
    this.db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), folderId);
  }

  deleteFolder(folderId: string): void {
    const removeFolder = this.db.transaction((targetFolderId: string) => {
      this.db.prepare('UPDATE songs SET folder_id = NULL WHERE folder_id = ?').run(targetFolderId);
      this.db.prepare('DELETE FROM folders WHERE id = ?').run(targetFolderId);
    });
    removeFolder(folderId);
  }

  getAllPlaylists(): PlaylistRow[] {
    const rows = this.db
      .prepare(`
        SELECT
          playlists.*,
          COUNT(playlist_songs.song_id) AS song_count
        FROM playlists
        LEFT JOIN playlist_songs ON playlist_songs.playlist_id = playlists.id
        GROUP BY playlists.id
        ORDER BY playlists.updated_at DESC, playlists.name COLLATE NOCASE ASC
      `)
      .all() as DbRow[];
    return rows.map(rowToPlaylist);
  }

  createPlaylist(name: string): PlaylistRow {
    const id = randomUUID();
    this.db.prepare('INSERT INTO playlists (id, name, description) VALUES (?, ?, \'\')').run(id, name.trim());
    return this.getPlaylist(id)!;
  }

  updatePlaylist(playlistId: string, updates: Partial<Pick<PlaylistRow, 'name' | 'description'>>): void {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      id: playlistId,
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      fields.push('name = @name');
      params.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      fields.push('description = @description');
      params.description = updates.description;
    }

    this.db.prepare(`UPDATE playlists SET ${fields.join(', ')} WHERE id = @id`).run(params);
  }

  deletePlaylist(playlistId: string): void {
    this.db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
  }

  getPlaylistSongs(playlistId: string): SongRow[] {
    const rows = this.db
      .prepare(`
        SELECT songs.*
        FROM playlist_songs
        INNER JOIN songs ON songs.id = playlist_songs.song_id
        WHERE playlist_songs.playlist_id = ?
        ORDER BY playlist_songs.sort_order ASC, songs.title COLLATE NOCASE ASC
      `)
      .all(playlistId) as DbRow[];
    return rows.map(rowToSong);
  }

  addSongToPlaylist(playlistId: string, songId: string): void {
    const addSong = this.db.transaction((nextPlaylistId: string, nextSongId: string) => {
      const current = this.db
        .prepare('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
        .get(nextPlaylistId, nextSongId);
      if (current) {
        return;
      }

      this.db
        .prepare('INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)')
        .run(nextPlaylistId, nextSongId, this.getNextPlaylistSortOrder(nextPlaylistId));
      this.touchPlaylist(nextPlaylistId);
    });
    addSong(playlistId, songId);
  }

  bulkAddToPlaylist(songIds: string[], playlistId: string): void {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }

    const addMany = this.db.transaction((nextIds: string[], nextPlaylistId: string) => {
      for (const songId of nextIds) {
        const exists = this.db
          .prepare('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
          .get(nextPlaylistId, songId);
        if (exists) {
          continue;
        }
        this.db
          .prepare('INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)')
          .run(nextPlaylistId, songId, this.getNextPlaylistSortOrder(nextPlaylistId));
      }
      this.touchPlaylist(nextPlaylistId);
    });
    addMany(ids, playlistId);
  }

  removeSongFromPlaylist(playlistId: string, songId: string): void {
    const removeSong = this.db.transaction((nextPlaylistId: string, nextSongId: string) => {
      this.db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(nextPlaylistId, nextSongId);
      this.normalizePlaylistSortOrder(nextPlaylistId);
      this.touchPlaylist(nextPlaylistId);
    });
    removeSong(playlistId, songId);
  }

  reorderPlaylistSong(playlistId: string, songId: string, newOrder: number): void {
    const reorder = this.db.transaction((nextPlaylistId: string, nextSongId: string, nextOrder: number) => {
      const rows = this.db
        .prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC, song_id ASC')
        .all(nextPlaylistId) as Array<{ song_id: string }>;
      const songIds = rows.map((row) => row.song_id);
      const currentIndex = songIds.indexOf(nextSongId);
      if (currentIndex === -1) {
        return;
      }

      songIds.splice(currentIndex, 1);
      const clampedIndex = Math.max(0, Math.min(nextOrder, songIds.length));
      songIds.splice(clampedIndex, 0, nextSongId);

      const updateStmt = this.db.prepare(
        'UPDATE playlist_songs SET sort_order = ? WHERE playlist_id = ? AND song_id = ?',
      );
      songIds.forEach((entrySongId, index) => {
        updateStmt.run(index, nextPlaylistId, entrySongId);
      });
      this.touchPlaylist(nextPlaylistId);
    });
    reorder(playlistId, songId, newOrder);
  }

  saveGameResult(payload: SaveGameResultPayload): SaveResultOutcome {
    const id = randomUUID();
    const now = new Date().toISOString();

    const saveTransaction = this.db.transaction((): SaveResultOutcome => {
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

      const insertMeasureAccuracy = this.db.prepare(`
        INSERT INTO measure_accuracy_history (id, game_result_id, measure, accuracy)
        VALUES (@id, @gameResultId, @measure, @accuracy)
      `);
      for (const entry of payload.measureAccuracy) {
        insertMeasureAccuracy.run({
          id: randomUUID(),
          gameResultId: id,
          measure: entry.measure,
          accuracy: entry.accuracy,
        });
      }

      const existing = this.db
        .prepare('SELECT * FROM user_stats WHERE song_id = ?')
        .get(payload.songId) as DbRow | undefined;

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
      this.recordPracticeDayEntry(payload.durationSec, 1, 0);
      this.updateTroubleSpotsForSong(payload.songId, payload.measureAccuracy, now);

      return {
        unlockedAchievementIds: this.checkAndUnlockAchievements(),
      };
    });

    return saveTransaction();
  }

  getGameResults(songId: string): GameResultRow[] {
    const rows = this.db
      .prepare('SELECT * FROM game_results WHERE song_id = ? ORDER BY timestamp DESC')
      .all(songId) as DbRow[];
    return rows.map(rowToGameResult);
  }

  getUserStats(songId: string): UserStatsRow | null {
    const row = this.db.prepare('SELECT * FROM user_stats WHERE song_id = ?').get(songId) as DbRow | undefined;
    return row ? rowToUserStats(row) : null;
  }

  saveTheoryResult(payload: SaveTheoryResultPayload): SaveResultOutcome {
    const id = randomUUID();
    const now = new Date().toISOString();

    const saveTransaction = this.db.transaction((): SaveResultOutcome => {
      this.db
        .prepare(`
          INSERT INTO theory_results
            (id, type, score, total_questions, accuracy, details, timestamp)
          VALUES
            (@id, @type, @score, @totalQuestions, @accuracy, @details, @timestamp)
        `)
        .run({
          id,
          type: payload.type,
          score: payload.score,
          totalQuestions: payload.totalQuestions,
          accuracy: payload.accuracy,
          details: JSON.stringify(payload.details ?? {}),
          timestamp: now,
        });

      this.recordPracticeDayEntry(0, 0, 1);

      return {
        unlockedAchievementIds: this.checkAndUnlockAchievements(),
      };
    });

    return saveTransaction();
  }

  getTheoryResults(type?: TheoryResultRow['type'], limit = 20): TheoryResultRow[] {
    const clampedLimit = Math.max(1, Math.min(limit, 200));
    const rows = (
      type
        ? this.db
            .prepare('SELECT * FROM theory_results WHERE type = ? ORDER BY timestamp DESC LIMIT ?')
            .all(type, clampedLimit)
        : this.db.prepare('SELECT * FROM theory_results ORDER BY timestamp DESC LIMIT ?').all(clampedLimit)
    ) as DbRow[];
    return rows.map(rowToTheoryResult);
  }

  getTheoryStats(type: TheoryResultRow['type']): TheoryStatsRow {
    const row = this.db
      .prepare(`
        SELECT
          COUNT(*) AS session_count,
          COALESCE(MAX(score), 0) AS best_score,
          COALESCE(AVG(accuracy), 0) AS average_accuracy,
          MAX(timestamp) AS last_played
        FROM theory_results
        WHERE type = ?
      `)
      .get(type) as DbRow;

    return {
      type,
      sessionCount: row.session_count as number,
      bestScore: row.best_score as number,
      averageAccuracy: row.average_accuracy as number,
      lastPlayed: (row.last_played as string | null | undefined) ?? null,
    };
  }

  getPracticeDays(fromDate: string, toDate: string): PracticeDayRow[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM practice_days
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
      `)
      .all(fromDate, toDate) as DbRow[];

    return rows.map(rowToPracticeDay);
  }

  recordPracticeTime(durationSec: number, songsPlayed: number, theorySessions: number): void {
    this.recordPracticeDayEntry(durationSec, songsPlayed, theorySessions);
  }

  getPracticeStreak(): PracticeStreak {
    const rows = this.db
      .prepare('SELECT date FROM practice_days WHERE total_practice_time_sec > 0 OR songs_played > 0 OR theory_sessions > 0 ORDER BY date ASC')
      .all() as Array<{ date: string }>;

    return calculatePracticeStreak(rows.map((row) => row.date), new Date());
  }

  getAllAchievements(): AchievementRow[] {
    const rows = this.db.prepare('SELECT * FROM achievements ORDER BY id ASC').all() as DbRow[];
    return rows.map(rowToAchievement);
  }

  unlockAchievement(achievementId: string): void {
    this.db
      .prepare('UPDATE achievements SET unlocked_at = COALESCE(unlocked_at, ?) WHERE id = ?')
      .run(new Date().toISOString(), achievementId);
  }

  getTroubleSpots(songId: string): TroubleSpotRow[] {
    const rows = this.db
      .prepare(`
        SELECT
          ts.*,
          (
            SELECT COUNT(*)
            FROM measure_accuracy_history mah
            INNER JOIN game_results gr ON gr.id = mah.game_result_id
            WHERE gr.song_id = ts.song_id
              AND mah.measure BETWEEN ts.measure_start AND ts.measure_end
              AND mah.accuracy < 70
          ) AS struggle_count,
          (
            SELECT MIN(mah.accuracy)
            FROM measure_accuracy_history mah
            INNER JOIN game_results gr ON gr.id = mah.game_result_id
            WHERE gr.song_id = ts.song_id
              AND mah.measure BETWEEN ts.measure_start AND ts.measure_end
          ) AS lowest_accuracy,
          (
            SELECT mah.accuracy
            FROM measure_accuracy_history mah
            INNER JOIN game_results gr ON gr.id = mah.game_result_id
            WHERE gr.song_id = ts.song_id
              AND mah.measure BETWEEN ts.measure_start AND ts.measure_end
            ORDER BY gr.timestamp DESC, mah.rowid DESC
            LIMIT 1
          ) AS latest_accuracy
        FROM trouble_spots ts
        WHERE ts.song_id = ?
        ORDER BY ts.is_resolved ASC, ts.measure_start ASC, ts.first_detected ASC
      `)
      .all(songId) as DbRow[];

    return rows.map(rowToTroubleSpot);
  }

  updateTroubleSpot(spotId: string, updates: Partial<Omit<TroubleSpotRow, 'id' | 'songId'>>): void {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id: spotId };

    if (updates.measureStart !== undefined) {
      fields.push('measure_start = @measureStart');
      params.measureStart = updates.measureStart;
    }
    if (updates.measureEnd !== undefined) {
      fields.push('measure_end = @measureEnd');
      params.measureEnd = updates.measureEnd;
    }
    if (updates.firstDetected !== undefined) {
      fields.push('first_detected = @firstDetected');
      params.firstDetected = updates.firstDetected;
    }
    if (updates.lastPracticed !== undefined) {
      fields.push('last_practiced = @lastPracticed');
      params.lastPracticed = updates.lastPracticed;
    }
    if (updates.resolutionCount !== undefined) {
      fields.push('resolution_count = @resolutionCount');
      params.resolutionCount = updates.resolutionCount;
    }
    if (updates.isResolved !== undefined) {
      fields.push('is_resolved = @isResolved');
      params.isResolved = updates.isResolved ? 1 : 0;
    }

    if (fields.length === 0) {
      return;
    }

    this.db.prepare(`UPDATE trouble_spots SET ${fields.join(', ')} WHERE id = @id`).run(params);
  }

  getMeasureAccuracyHistory(songId: string): MeasureAccuracyHistoryRow[] {
    const rows = this.db
      .prepare(`
        SELECT mah.*
        FROM measure_accuracy_history mah
        INNER JOIN game_results gr ON gr.id = mah.game_result_id
        WHERE gr.song_id = ?
        ORDER BY gr.timestamp DESC, mah.measure ASC
      `)
      .all(songId) as DbRow[];

    return rows.map(rowToMeasureAccuracyHistory);
  }

  getRecommendations(): RecommendationResult {
    const songs = this.getAllSongs();
    const statsRows = this.db.prepare('SELECT * FROM user_stats').all() as DbRow[];
    const userStatsBySongId = Object.fromEntries(statsRows.map((row) => {
      const stats = rowToUserStats(row);
      return [stats.songId, stats] as const;
    }));

    const recentResults30 = this.db
      .prepare(`
        SELECT *
        FROM game_results
        WHERE datetime(timestamp) >= datetime('now', '-30 days')
        ORDER BY timestamp DESC
      `)
      .all() as DbRow[];
    const recentResults60 = this.db
      .prepare(`
        SELECT *
        FROM game_results
        WHERE datetime(timestamp) >= datetime('now', '-60 days')
        ORDER BY timestamp DESC
      `)
      .all() as DbRow[];

    return generateRecommendations({
      songs,
      userStatsBySongId,
      recentResults30: recentResults30.map(rowToGameResult),
      recentResults60: recentResults60.map(rowToGameResult),
    });
  }

  getProgressStats(fromDate: string, toDate: string): ProgressStatsResult {
    const practiceRows = this.getPracticeDays(fromDate, toDate);
    const practiceDaysByDate = new Map(practiceRows.map((row) => [row.date, row]));

    const songsPlayedByWeekRows = this.db
      .prepare(`
        SELECT
          date(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days') AS week_start,
          SUM(songs_played) AS count
        FROM practice_days
        WHERE date BETWEEN ? AND ?
        GROUP BY week_start
        ORDER BY week_start ASC
      `)
      .all(fromDate, toDate) as DbRow[];

    const accuracyTrendRows = this.db
      .prepare(`
        SELECT
          substr(timestamp, 1, 10) AS date,
          AVG(accuracy) AS avg_accuracy
        FROM game_results
        WHERE substr(timestamp, 1, 10) BETWEEN ? AND ?
        GROUP BY substr(timestamp, 1, 10)
        ORDER BY date ASC
      `)
      .all(fromDate, toDate) as DbRow[];

    const totalStats = this.db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM songs) AS total_songs,
          (SELECT COUNT(*) FROM user_stats WHERE best_accuracy >= 90) AS songs_mastered,
          (SELECT COALESCE(SUM(total_practice_time_sec), 0) FROM practice_days) AS total_practice_time_sec,
          (
            SELECT COALESCE(s.genre, '')
            FROM songs s
            INNER JOIN user_stats us ON us.song_id = s.id
            WHERE TRIM(s.genre) <> ''
            GROUP BY s.genre
            ORDER BY SUM(us.play_count) DESC, s.genre ASC
            LIMIT 1
          ) AS favorite_genre
      `)
      .get() as DbRow;

    return {
      practiceTimeByDay: buildPracticeDaySeries(fromDate, toDate, practiceDaysByDate),
      songsPlayedByWeek: songsPlayedByWeekRows.map((row) => ({
        weekStart: row.week_start as string,
        count: row.count as number,
      })),
      accuracyTrend: accuracyTrendRows.map((row) => ({
        date: row.date as string,
        avgAccuracy: Math.round(((row.avg_accuracy as number) ?? 0) * 10) / 10,
      })),
      totalStats: {
        totalSongs: totalStats.total_songs as number,
        songsMastered: totalStats.songs_mastered as number,
        totalPracticeTimeSec: totalStats.total_practice_time_sec as number,
        favoriteGenre: (totalStats.favorite_genre as string) || 'Unspecified',
      },
    };
  }

  private recordPracticeDayEntry(durationSec: number, songsPlayed: number, theorySessions: number): void {
    const practiceDate = formatLocalDate(new Date());

    this.db
      .prepare(`
        INSERT INTO practice_days (date, total_practice_time_sec, songs_played, theory_sessions)
        VALUES (@date, @durationSec, @songsPlayed, @theorySessions)
        ON CONFLICT(date) DO UPDATE SET
          total_practice_time_sec = total_practice_time_sec + excluded.total_practice_time_sec,
          songs_played = songs_played + excluded.songs_played,
          theory_sessions = theory_sessions + excluded.theory_sessions
      `)
      .run({
        date: practiceDate,
        durationSec,
        songsPlayed,
        theorySessions,
      });
  }

  private updateTroubleSpotsForSong(
    songId: string,
    measureAccuracy: SaveGameResultPayload['measureAccuracy'],
    practicedAt: string,
  ): void {
    const existingRows = this.db
      .prepare('SELECT * FROM trouble_spots WHERE song_id = ? ORDER BY measure_start ASC')
      .all(songId) as DbRow[];
    const byMeasure = new Map(existingRows.map((row) => [row.measure_start as number, row]));

    for (const entry of measureAccuracy) {
      const existing = byMeasure.get(entry.measure);

      if (entry.accuracy < 70) {
        if (!existing) {
          this.db
            .prepare(`
              INSERT INTO trouble_spots
                (id, song_id, measure_start, measure_end, first_detected, last_practiced, resolution_count, is_resolved)
              VALUES
                (@id, @songId, @measureStart, @measureEnd, @firstDetected, @lastPracticed, 0, 0)
            `)
            .run({
              id: randomUUID(),
              songId,
              measureStart: entry.measure,
              measureEnd: entry.measure,
              firstDetected: practicedAt,
              lastPracticed: practicedAt,
            });
          continue;
        }

        this.db
          .prepare(`
            UPDATE trouble_spots
            SET
              last_practiced = @lastPracticed,
              resolution_count = 0,
              is_resolved = 0
            WHERE id = @id
          `)
          .run({
            id: existing.id,
            lastPracticed: practicedAt,
          });
        continue;
      }

      if (!existing) {
        continue;
      }

      if (entry.accuracy > 85) {
        const nextResolutionCount = (existing.resolution_count as number) + 1;
        this.db
          .prepare(`
            UPDATE trouble_spots
            SET
              last_practiced = @lastPracticed,
              resolution_count = @resolutionCount,
              is_resolved = @isResolved
            WHERE id = @id
          `)
          .run({
            id: existing.id,
            lastPracticed: practicedAt,
            resolutionCount: nextResolutionCount,
            isResolved: nextResolutionCount >= 3 ? 1 : 0,
          });
      } else {
        this.db
          .prepare('UPDATE trouble_spots SET last_practiced = ? WHERE id = ?')
          .run(practicedAt, existing.id);
      }
    }
  }

  private checkAndUnlockAchievements(): string[] {
    const unlockedIds = new Set(
      (
        this.db
          .prepare('SELECT id FROM achievements WHERE unlocked_at IS NOT NULL')
          .all() as Array<{ id: string }>
      ).map((row) => row.id),
    );
    const metrics = this.buildAchievementMetrics();
    const unlockableIds = getUnlockableAchievementIds(metrics, unlockedIds);

    if (unlockableIds.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const unlockStatement = this.db.prepare('UPDATE achievements SET unlocked_at = COALESCE(unlocked_at, ?) WHERE id = ?');
    for (const achievementId of unlockableIds) {
      unlockStatement.run(now, achievementId);
    }

    return unlockableIds;
  }

  private buildAchievementMetrics(): AchievementMetrics {
    const row = this.db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM game_results) AS completed_song_sessions,
          EXISTS(SELECT 1 FROM game_results WHERE accuracy >= 100) AS has_perfect_score,
          (SELECT COUNT(*) FROM theory_results) AS theory_session_count,
          (SELECT COUNT(*) FROM user_stats WHERE best_accuracy >= 90) AS mastered_song_count
      `)
      .get() as DbRow;

    const streak = this.getPracticeStreak();

    return {
      completedSongSessions: row.completed_song_sessions as number,
      hasPerfectScore: Boolean(row.has_perfect_score),
      currentStreak: streak.currentStreak,
      theorySessionCount: row.theory_session_count as number,
      masteredSongCount: row.mastered_song_count as number,
    };
  }

  getSetting(category: string, key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE category = ? AND key = ?')
      .get(category, key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  getAllSettings(): SettingRow[] {
    return this.db.prepare('SELECT category, key, value FROM settings ORDER BY category, key').all() as SettingRow[];
  }

  setSetting(category: string, key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)').run(category, key, value);
  }

  resetLearningProgress(): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM measure_accuracy_history').run();
      this.db.prepare('DELETE FROM trouble_spots').run();
      this.db.prepare('DELETE FROM game_results').run();
      this.db.prepare('DELETE FROM theory_results').run();
      this.db.prepare('DELETE FROM user_stats').run();
      this.db.prepare('DELETE FROM practice_days').run();
      this.db.prepare('DELETE FROM achievements').run();
      this.db.prepare('UPDATE songs SET times_played = 0').run();
      this.seedAchievements();
    })();
  }

  resetUserData(): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM measure_accuracy_history').run();
      this.db.prepare('DELETE FROM trouble_spots').run();
      this.db.prepare('DELETE FROM game_results').run();
      this.db.prepare('DELETE FROM theory_results').run();
      this.db.prepare('DELETE FROM user_stats').run();
      this.db.prepare('DELETE FROM practice_days').run();
      this.db.prepare('DELETE FROM fingerings').run();
      this.db.prepare('DELETE FROM playlist_songs').run();
      this.db.prepare('DELETE FROM playlists').run();
      this.db.prepare('DELETE FROM folders').run();
      this.db.prepare('DELETE FROM songs').run();
      this.db.prepare('DELETE FROM settings').run();
      this.db.prepare('DELETE FROM achievements').run();
      this.seedAchievements();
    })();
  }

  exportLibraryData(): LibraryBackup {
    const playlists = this.getAllPlaylists().map((playlist) => ({
      ...playlist,
      songIds: (
        this.db
          .prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC')
          .all(playlist.id) as Array<{ song_id: string }>
      ).map((row) => row.song_id),
    }));
    const fingerings = this.db.prepare('SELECT * FROM fingerings ORDER BY song_id, note_index').all() as DbRow[];

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: this.getAllSongs(),
      folders: this.getAllFolders(),
      playlists,
      fingerings: fingerings.map(rowToFingering),
      settings: this.getAllSettings(),
    };
  }

  importLibraryData(backup: LibraryBackup): LibraryImportResult {
    const importTransaction = this.db.transaction((nextBackup: LibraryBackup) => {
      const folderIdMap = new Map<string, string | null>();
      let foldersImported = 0;
      let playlistsImported = 0;

      for (const folder of nextBackup.folders) {
        const existingByName = this.db.prepare('SELECT id FROM folders WHERE name = ?').get(folder.name) as
          | { id: string }
          | undefined;
        const targetId = existingByName?.id ?? folder.id;
        this.db
          .prepare(`
            INSERT INTO folders (id, name, sort_order, created_at)
            VALUES (@id, @name, @sortOrder, @createdAt)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              sort_order = excluded.sort_order,
              created_at = excluded.created_at
          `)
          .run({
            id: targetId,
            name: folder.name,
            sortOrder: folder.sortOrder,
            createdAt: folder.createdAt,
          });
        folderIdMap.set(folder.id, targetId);
        foldersImported += 1;
      }

      for (const song of nextBackup.songs) {
        const targetFolderId = song.folderId ? folderIdMap.get(song.folderId) ?? null : null;
        this.db
          .prepare(`
            INSERT INTO songs
              (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, date_added,
               times_played, tags, is_favorite, folder_id, track_assignments)
            VALUES
              (@id, @title, @artist, @genre, @filePath, @difficulty, @durationSec, @bpm, @noteCount, @dateAdded,
               @timesPlayed, @tags, @isFavorite, @folderId, @trackAssignments)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              artist = excluded.artist,
              genre = excluded.genre,
              file_path = excluded.file_path,
              difficulty = excluded.difficulty,
              duration_sec = excluded.duration_sec,
              bpm = excluded.bpm,
              note_count = excluded.note_count,
              date_added = excluded.date_added,
              times_played = excluded.times_played,
              tags = excluded.tags,
              is_favorite = excluded.is_favorite,
              folder_id = excluded.folder_id,
              track_assignments = excluded.track_assignments
          `)
          .run({
            id: song.id,
            title: song.title,
            artist: song.artist,
            genre: song.genre,
            filePath: song.filePath,
            difficulty: song.difficulty,
            durationSec: song.durationSec,
            bpm: song.bpm,
            noteCount: song.noteCount,
            dateAdded: song.dateAdded,
            timesPlayed: song.timesPlayed,
            tags: JSON.stringify(song.tags),
            isFavorite: song.isFavorite ? 1 : 0,
            folderId: targetFolderId,
            trackAssignments: JSON.stringify(song.trackAssignments),
          });
      }

      for (const fingering of nextBackup.fingerings) {
        const songExists = this.db.prepare('SELECT 1 FROM songs WHERE id = ?').get(fingering.songId);
        if (!songExists) {
          continue;
        }
        this.saveCustomFingering(fingering.songId, fingering.noteIndex, fingering.finger, fingering.hand);
      }

      for (const setting of nextBackup.settings) {
        this.setSetting(setting.category, setting.key, setting.value);
      }

      for (const playlist of nextBackup.playlists) {
        const existingByName = this.db.prepare('SELECT id FROM playlists WHERE name = ?').get(playlist.name) as
          | { id: string }
          | undefined;
        const targetId = existingByName?.id ?? playlist.id;
        this.db
          .prepare(`
            INSERT INTO playlists (id, name, description, created_at, updated_at)
            VALUES (@id, @name, @description, @createdAt, @updatedAt)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at
          `)
          .run({
            id: targetId,
            name: playlist.name,
            description: playlist.description,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
          });

        this.db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(targetId);
        playlist.songIds.forEach((songId, index) => {
          const songExists = this.db.prepare('SELECT 1 FROM songs WHERE id = ?').get(songId);
          if (!songExists) {
            return;
          }
          this.db
            .prepare('INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)')
            .run(targetId, songId, index);
        });
        this.touchPlaylist(targetId, playlist.updatedAt);
        playlistsImported += 1;
      }

      return {
        songsImported: nextBackup.songs.length,
        foldersImported,
        playlistsImported,
      };
    });

    return importTransaction(backup);
  }

  close(): void {
    this.db.close();
  }

  private getFolder(id: string): FolderRow | null {
    const row = this.db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as DbRow | undefined;
    return row ? rowToFolder(row) : null;
  }

  private getPlaylist(id: string): PlaylistRow | null {
    const row = this.db
      .prepare(`
        SELECT playlists.*, COUNT(playlist_songs.song_id) AS song_count
        FROM playlists
        LEFT JOIN playlist_songs ON playlist_songs.playlist_id = playlists.id
        WHERE playlists.id = ?
        GROUP BY playlists.id
      `)
      .get(id) as DbRow | undefined;
    return row ? rowToPlaylist(row) : null;
  }

  private getNextSortOrder(tableName: 'folders'): number {
    const row = this.db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM ${tableName}`).get() as {
      nextOrder: number;
    };
    return row.nextOrder;
  }

  private getNextPlaylistSortOrder(playlistId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM playlist_songs WHERE playlist_id = ?')
      .get(playlistId) as { nextOrder: number };
    return row.nextOrder;
  }

  private normalizePlaylistSortOrder(playlistId: string): void {
    const rows = this.db
      .prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC, song_id ASC')
      .all(playlistId) as Array<{ song_id: string }>;
    const updateStmt = this.db.prepare(
      'UPDATE playlist_songs SET sort_order = ? WHERE playlist_id = ? AND song_id = ?',
    );
    rows.forEach((row, index) => {
      updateStmt.run(index, playlistId, row.song_id);
    });
  }

  private touchPlaylist(playlistId: string, timestamp = new Date().toISOString()): void {
    this.db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(timestamp, playlistId);
  }
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id.trim() !== ''))];
}

function normalizeTag(tag: string): string {
  return tag.trim();
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

function rowToSong(row: DbRow): SongRow {
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
    folderId: (row.folder_id as string | null | undefined) ?? null,
    trackAssignments: parseTrackAssignments(row.track_assignments),
  };
}

function rowToFolder(row: DbRow): FolderRow {
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

function rowToPlaylist(row: DbRow): PlaylistRow {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    songCount: row.song_count as number | undefined,
  };
}

function rowToFingering(row: DbRow): FingeringRow {
  return {
    songId: row.song_id as string,
    noteIndex: row.note_index as number,
    finger: row.finger as number,
    hand: row.hand as Hand,
  };
}

function rowToGameResult(row: DbRow): GameResultRow {
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

function rowToPracticeDay(row: DbRow): PracticeDayRow {
  return {
    date: row.date as string,
    totalPracticeTimeSec: row.total_practice_time_sec as number,
    songsPlayed: row.songs_played as number,
    theorySessions: row.theory_sessions as number,
  };
}

function rowToUserStats(row: DbRow): UserStatsRow {
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

function rowToAchievement(row: DbRow): AchievementRow {
  return {
    id: row.id as string,
    unlockedAt: (row.unlocked_at as string | null | undefined) ?? null,
  };
}

function rowToTroubleSpot(row: DbRow): TroubleSpotRow {
  return {
    id: row.id as string,
    songId: row.song_id as string,
    measureStart: row.measure_start as number,
    measureEnd: row.measure_end as number,
    firstDetected: row.first_detected as string,
    lastPracticed: (row.last_practiced as string | null | undefined) ?? null,
    resolutionCount: row.resolution_count as number,
    isResolved: (row.is_resolved as number) === 1,
    struggleCount: (row.struggle_count as number | undefined) ?? 0,
    lowestAccuracy: (row.lowest_accuracy as number | null | undefined) ?? null,
    latestAccuracy: (row.latest_accuracy as number | null | undefined) ?? null,
  };
}

function rowToMeasureAccuracyHistory(row: DbRow): MeasureAccuracyHistoryRow {
  return {
    id: row.id as string,
    gameResultId: row.game_result_id as string,
    measure: row.measure as number,
    accuracy: row.accuracy as number,
  };
}

function rowToTheoryResult(row: DbRow): TheoryResultRow {
  return {
    id: row.id as string,
    type: row.type as TheoryResultRow['type'],
    score: row.score as number,
    totalQuestions: row.total_questions as number,
    accuracy: row.accuracy as number,
    details: parseJsonObject(row.details),
    timestamp: row.timestamp as string,
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore invalid JSON payloads in legacy rows.
  }

  return {};
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculatePracticeStreak(dates: string[], currentDate: Date): PracticeStreak {
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
    };
  }

  const uniqueDates = [...new Set(dates)].sort((left, right) => left.localeCompare(right));
  let longestStreak = 1;
  let runningStreak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00`);
    const current = new Date(`${uniqueDates[index]}T00:00:00`);
    const dayDelta = Math.round((current.getTime() - previous.getTime()) / 86_400_000);

    if (dayDelta === 1) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  const dateSet = new Set(uniqueDates);
  let currentStreak = 0;
  const cursor = new Date(currentDate);
  while (dateSet.has(formatLocalDate(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    currentStreak,
    longestStreak,
  };
}

function buildPracticeDaySeries(
  fromDate: string,
  toDate: string,
  rowsByDate: Map<string, PracticeDayRow>,
): Array<{ date: string; minutes: number }> {
  const series: Array<{ date: string; minutes: number }> = [];
  const cursor = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  while (cursor.getTime() <= end.getTime()) {
    const date = formatLocalDate(cursor);
    const row = rowsByDate.get(date);
    series.push({
      date,
      minutes: Math.round((((row?.totalPracticeTimeSec ?? 0) / 60) * 10)) / 10,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}
