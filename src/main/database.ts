import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { Hand, TrackAssignment } from '../lib/game/types';
import type {
  AddSongPayload,
  FingeringRow,
  FolderRow,
  GameResultRow,
  LibraryBackup,
  LibraryImportResult,
  PlaylistRow,
  SaveGameResultPayload,
  SaveTheoryResultPayload,
  SettingRow,
  SongRow,
  TheoryResultRow,
  TheoryStatsRow,
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
  }

  private ensureSongFolderColumn(): void {
    const columns = this.db.prepare(`PRAGMA table_info(songs)`).all() as Array<{ name: string }>;
    const hasFolderId = columns.some((column) => column.name === 'folder_id');
    if (!hasFolderId) {
      this.db.prepare(`ALTER TABLE songs ADD COLUMN folder_id TEXT`).run();
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
    });

    saveTransaction();
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

  saveTheoryResult(payload: SaveTheoryResultPayload): void {
    const id = randomUUID();
    const now = new Date().toISOString();

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
