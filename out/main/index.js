import { app, ipcMain, dialog, BrowserWindow } from "electron";
import { existsSync, readFileSync, renameSync, mkdirSync, copyFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as MidiPackage from "@tonejs/midi";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function noteNumberToName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${MIDI_NOTE_NAMES[midi % 12]}${octave}`;
}
function defaultHandForMidi(midi) {
  return midi < 60 ? "left" : "right";
}
function defaultAssignmentForNotes(notes) {
  if (notes.length === 0) {
    return "both";
  }
  const allLeft = notes.every((note) => note.midi < 60);
  if (allLeft) {
    return "left";
  }
  const allRight = notes.every((note) => note.midi >= 60);
  if (allRight) {
    return "right";
  }
  return "both";
}
function getTrackAssignments(song) {
  return Object.fromEntries(song.tracks.map((track) => [track.id, track.assignment]));
}
function resolveMidiConstructor() {
  const moduleValue = MidiPackage;
  const constructor = moduleValue.Midi ?? moduleValue.default?.Midi;
  if (!constructor) {
    throw new Error("Unable to resolve Midi constructor from @tonejs/midi.");
  }
  return constructor;
}
const MidiCtor = resolveMidiConstructor();
function parseMidiFile(arrayBuffer, meta) {
  const midi = new MidiCtor(arrayBuffer);
  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const tracks = midi.tracks.map((track, index) => {
    const trackId = `track-${index}`;
    return {
      id: trackId,
      name: track.name?.trim() || `Track ${index + 1}`,
      sourceTrackIndex: index,
      defaultAssignment: defaultAssignmentForNotes(track.notes),
      assignment: defaultAssignmentForNotes(track.notes)
    };
  });
  const notes = midi.tracks.flatMap(
    (track, trackIndex) => track.notes.map((note, noteIndex) => ({
      id: `track-${trackIndex}-note-${noteIndex}`,
      trackId: `track-${trackIndex}`,
      midi: note.midi,
      name: note.name || noteNumberToName(note.midi),
      velocity: note.velocity,
      startSec: note.time,
      durationSec: note.duration,
      hand: defaultHandForMidi(note.midi)
    }))
  );
  return {
    id: meta.songId,
    title: meta.title,
    ppq: midi.header.ppq,
    bpm,
    durationSec: midi.duration,
    tracks,
    notes: notes.sort((left, right) => left.startSec - right.startSec || left.midi - right.midi)
  };
}
function getUnlockableAchievementIds(metrics, unlockedIds) {
  const unlockable = [];
  const addIfLocked = (achievementId, condition) => {
    if (condition && !unlockedIds.has(achievementId)) {
      unlockable.push(achievementId);
    }
  };
  addIfLocked("first-song", metrics.completedSongSessions >= 1);
  addIfLocked("perfect-score", metrics.hasPerfectScore);
  addIfLocked("streak-7", metrics.currentStreak >= 7);
  addIfLocked("streak-30", metrics.currentStreak >= 30);
  addIfLocked("century-club", metrics.completedSongSessions >= 100);
  addIfLocked("theorist", metrics.theorySessionCount >= 10);
  addIfLocked("master-10", metrics.masteredSongCount >= 10);
  return unlockable;
}
const ACHIEVEMENTS = [
  {
    id: "first-song",
    name: "First Steps",
    description: "Complete your first song.",
    icon: "1"
  },
  {
    id: "perfect-score",
    name: "Perfectionist",
    description: "Reach 100% accuracy on any song.",
    icon: "*"
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day practice streak.",
    icon: "7"
  },
  {
    id: "streak-30",
    name: "Monthly Master",
    description: "Maintain a 30-day practice streak.",
    icon: "30"
  },
  {
    id: "century-club",
    name: "Century Club",
    description: "Complete 100 song sessions.",
    icon: "100"
  },
  {
    id: "theorist",
    name: "Music Theorist",
    description: "Complete 10 theory sessions.",
    icon: "10"
  },
  {
    id: "master-10",
    name: "Master",
    description: "Reach 90%+ accuracy on 10 songs.",
    icon: "10x"
  }
];
function average(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function summarizePerformance(results) {
  const grouped = /* @__PURE__ */ new Map();
  for (const result of results) {
    const bucket = grouped.get(result.songId) ?? [];
    bucket.push(result);
    grouped.set(result.songId, bucket);
  }
  return new Map(
    [...grouped.entries()].map(([songId, bucket]) => [
      songId,
      {
        songId,
        lastPlayed: bucket.map((entry) => entry.timestamp).sort((left, right) => right.localeCompare(left))[0] ?? null,
        playCount: bucket.length,
        averageAccuracy: average(bucket.map((entry) => entry.accuracy))
      }
    ])
  );
}
function isBalancedHandSong(song) {
  const assignments = Object.values(song.trackAssignments);
  if (assignments.length === 0) {
    return true;
  }
  const leftCount = assignments.filter((assignment) => assignment === "left").length;
  const rightCount = assignments.filter((assignment) => assignment === "right").length;
  if (leftCount === 0 || rightCount === 0) {
    return false;
  }
  const ratio = leftCount / rightCount;
  return ratio >= 0.6 && ratio <= 1.66;
}
function byDifficultyThenRecency(left, right, performance) {
  const difficultyDelta = left.difficulty - right.difficulty;
  if (difficultyDelta !== 0) {
    return difficultyDelta;
  }
  const leftPlayed = performance.get(left.id)?.lastPlayed ?? "";
  const rightPlayed = performance.get(right.id)?.lastPlayed ?? "";
  return leftPlayed.localeCompare(rightPlayed);
}
function takeSongs(songs, usedIds, reasonBuilder, limit = 3) {
  const items = [];
  for (const song of songs) {
    if (usedIds.has(song.id)) {
      continue;
    }
    usedIds.add(song.id);
    items.push({
      song,
      reason: reasonBuilder(song)
    });
    if (items.length >= limit) {
      break;
    }
  }
  return items;
}
function generateRecommendations({
  songs,
  userStatsBySongId,
  recentResults30,
  recentResults60
}) {
  const usedIds = /* @__PURE__ */ new Set();
  const recent30BySong = summarizePerformance(recentResults30);
  const recent60BySong = summarizePerformance(recentResults60);
  const recentSuccesses = songs.filter((song) => {
    const performance = recent30BySong.get(song.id);
    return performance !== void 0 && performance.averageAccuracy !== null && performance.averageAccuracy >= 80;
  });
  const historicallyStrongSongs = songs.filter((song) => (userStatsBySongId[song.id]?.bestAccuracy ?? 0) >= 80);
  const baselineDifficulty = average(recentSuccesses.map((song) => song.difficulty)) ?? average(historicallyStrongSongs.map((song) => song.difficulty)) ?? 3;
  const nextChallengeCandidates = [...songs].filter((song) => song.difficulty >= Math.ceil(baselineDifficulty + 1) && song.difficulty <= Math.ceil(baselineDifficulty + 2)).filter((song) => {
    const stats = userStatsBySongId[song.id];
    const recentPerformance = recent30BySong.get(song.id);
    return !stats || !recentPerformance || (recentPerformance.averageAccuracy ?? 0) < 70;
  }).sort((left, right) => byDifficultyThenRecency(left, right, recent30BySong));
  const weakerSongs = songs.filter((song) => {
    const performance = recent30BySong.get(song.id);
    return performance !== void 0 && performance.averageAccuracy !== null && performance.averageAccuracy < 75;
  });
  const skillTargetDifficulty = average(weakerSongs.map((song) => song.difficulty)) ?? Math.max(2, Math.round(baselineDifficulty));
  const skillBuilderCandidates = [...songs].filter((song) => isBalancedHandSong(song)).filter((song) => Math.abs(song.difficulty - skillTargetDifficulty) <= 1).sort((left, right) => byDifficultyThenRecency(left, right, recent30BySong));
  const genreCounts = /* @__PURE__ */ new Map();
  for (const result of recentResults60) {
    const song = songs.find((entry) => entry.id === result.songId);
    if (!song?.genre.trim()) {
      continue;
    }
    genreCounts.set(song.genre, (genreCounts.get(song.genre) ?? 0) + 1);
  }
  const preferredGenres = [...genreCounts.entries()].sort((left, right) => right[1] - left[1]).map(([genre]) => genre).slice(0, 2);
  const youMightLikeCandidates = [...songs].filter((song) => preferredGenres.includes(song.genre)).filter((song) => (userStatsBySongId[song.id]?.playCount ?? 0) <= 1).sort((left, right) => {
    const leftGenreCount = genreCounts.get(left.genre) ?? 0;
    const rightGenreCount = genreCounts.get(right.genre) ?? 0;
    if (leftGenreCount !== rightGenreCount) {
      return rightGenreCount - leftGenreCount;
    }
    return left.title.localeCompare(right.title);
  });
  const revisitCandidates = [...songs].filter((song) => {
    const stats = userStatsBySongId[song.id];
    if (!stats || stats.playCount === 0) {
      return false;
    }
    const recentPerformance = recent60BySong.get(song.id)?.averageAccuracy ?? stats.bestAccuracy;
    return recentPerformance >= 60 && recentPerformance <= 85;
  }).sort((left, right) => {
    const leftPlayed = userStatsBySongId[left.id]?.lastPlayed ?? "";
    const rightPlayed = userStatsBySongId[right.id]?.lastPlayed ?? "";
    return leftPlayed.localeCompare(rightPlayed);
  });
  return {
    nextChallenge: takeSongs(
      nextChallengeCandidates,
      usedIds,
      (song) => `Difficulty ${song.difficulty} is just above your recent comfort zone.`
    ),
    skillBuilder: takeSongs(
      skillBuilderCandidates,
      usedIds,
      () => "Balanced hand work to reinforce coordination and timing."
    ),
    youMightLike: takeSongs(
      youMightLikeCandidates,
      usedIds,
      (song) => `You have been leaning into ${song.genre || "this style"} lately.`
    ),
    revisit: takeSongs(
      revisitCandidates,
      usedIds,
      () => "Solid foundation already there. Another pass should convert this into a strong score."
    )
  };
}
class AppDatabase {
  db;
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initialize();
  }
  initialize() {
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
    this.db.prepare(`INSERT OR IGNORE INTO settings (category, key, value) VALUES ('fingering', 'handSize', 'medium')`).run();
    this.seedAchievements();
  }
  ensureSongFolderColumn() {
    const columns = this.db.prepare(`PRAGMA table_info(songs)`).all();
    const hasFolderId = columns.some((column) => column.name === "folder_id");
    if (!hasFolderId) {
      this.db.prepare(`ALTER TABLE songs ADD COLUMN folder_id TEXT`).run();
    }
  }
  seedAchievements() {
    const insert = this.db.prepare("INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, NULL)");
    for (const achievement of ACHIEVEMENTS) {
      insert.run(achievement.id);
    }
  }
  migrateFromJson(userDataPath) {
    const jsonPath = join(userDataPath, "song-metadata.json");
    if (!existsSync(jsonPath)) {
      return;
    }
    const count = this.db.prepare("SELECT COUNT(*) as n FROM songs").get().n;
    if (count > 0) {
      return;
    }
    try {
      const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO songs (id, title, file_path, track_assignments, date_added, tags)
        VALUES (@id, @title, @filePath, @trackAssignments, @dateAdded, '[]')
      `);
      const insertMany = this.db.transaction(
        (entries2) => {
          for (const entry of entries2) {
            insert.run(entry);
          }
        }
      );
      const entries = Object.entries(raw.songs).map(([id, meta]) => ({
        id,
        title: meta.title,
        filePath: meta.sourcePath ?? "",
        trackAssignments: JSON.stringify(meta.trackAssignments),
        dateAdded: meta.updatedAt
      }));
      insertMany(entries);
      renameSync(jsonPath, jsonPath + ".migrated");
    } catch {
    }
  }
  getAllSongs() {
    const rows = this.db.prepare("SELECT * FROM songs ORDER BY date_added DESC").all();
    return rows.map(rowToSong);
  }
  getSong(id) {
    const row = this.db.prepare("SELECT * FROM songs WHERE id = ?").get(id);
    return row ? rowToSong(row) : null;
  }
  addSong(payload) {
    this.db.prepare(`
        INSERT OR IGNORE INTO songs
          (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments, folder_id)
        VALUES
          (@id, @title, @artist, @genre, @filePath, @difficulty, @durationSec, @bpm, @noteCount, @tags, @trackAssignments, @folderId)
      `).run({
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
      folderId: payload.folderId ?? null
    });
    return this.getSong(payload.id);
  }
  updateSong(id, updates) {
    const fields = [];
    const params = { id };
    if (updates.title !== void 0) {
      fields.push("title = @title");
      params.title = updates.title;
    }
    if (updates.artist !== void 0) {
      fields.push("artist = @artist");
      params.artist = updates.artist;
    }
    if (updates.genre !== void 0) {
      fields.push("genre = @genre");
      params.genre = updates.genre;
    }
    if (updates.filePath !== void 0) {
      fields.push("file_path = @filePath");
      params.filePath = updates.filePath;
    }
    if (updates.difficulty !== void 0) {
      fields.push("difficulty = @difficulty");
      params.difficulty = updates.difficulty;
    }
    if (updates.durationSec !== void 0) {
      fields.push("duration_sec = @durationSec");
      params.durationSec = updates.durationSec;
    }
    if (updates.bpm !== void 0) {
      fields.push("bpm = @bpm");
      params.bpm = updates.bpm;
    }
    if (updates.noteCount !== void 0) {
      fields.push("note_count = @noteCount");
      params.noteCount = updates.noteCount;
    }
    if (updates.tags !== void 0) {
      fields.push("tags = @tags");
      params.tags = JSON.stringify(updates.tags);
    }
    if (updates.isFavorite !== void 0) {
      fields.push("is_favorite = @isFavorite");
      params.isFavorite = updates.isFavorite ? 1 : 0;
    }
    if (updates.folderId !== void 0) {
      fields.push("folder_id = @folderId");
      params.folderId = updates.folderId;
    }
    if (updates.trackAssignments !== void 0) {
      fields.push("track_assignments = @trackAssignments");
      params.trackAssignments = JSON.stringify(updates.trackAssignments);
    }
    if (fields.length === 0) {
      return;
    }
    this.db.prepare(`UPDATE songs SET ${fields.join(", ")} WHERE id = @id`).run(params);
  }
  deleteSong(id) {
    this.db.prepare("DELETE FROM songs WHERE id = ?").run(id);
  }
  bulkDeleteSongs(songIds) {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }
    const removeMany = this.db.transaction((nextIds) => {
      const stmt = this.db.prepare("DELETE FROM songs WHERE id = ?");
      for (const songId of nextIds) {
        stmt.run(songId);
      }
    });
    removeMany(ids);
  }
  toggleFavorite(id) {
    this.db.prepare("UPDATE songs SET is_favorite = 1 - is_favorite WHERE id = ?").run(id);
  }
  moveSongToFolder(songId, folderId) {
    this.db.prepare("UPDATE songs SET folder_id = ? WHERE id = ?").run(folderId, songId);
  }
  bulkMoveSongsToFolder(songIds, folderId) {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }
    const moveMany = this.db.transaction((nextIds) => {
      const stmt = this.db.prepare("UPDATE songs SET folder_id = ? WHERE id = ?");
      for (const songId of nextIds) {
        stmt.run(folderId, songId);
      }
    });
    moveMany(ids);
  }
  bulkAddTag(songIds, tag) {
    this.bulkUpdateTags(songIds, (tags) => {
      const normalizedTag = normalizeTag(tag);
      return normalizedTag && !tags.includes(normalizedTag) ? [...tags, normalizedTag] : tags;
    });
  }
  bulkRemoveTag(songIds, tag) {
    this.bulkUpdateTags(songIds, (tags) => tags.filter((entry) => entry !== normalizeTag(tag)));
  }
  bulkUpdateTags(songIds, updater) {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }
    const updateMany = this.db.transaction((nextIds) => {
      const selectStmt = this.db.prepare("SELECT id, tags FROM songs WHERE id = ?");
      const updateStmt = this.db.prepare("UPDATE songs SET tags = ? WHERE id = ?");
      for (const songId of nextIds) {
        const row = selectStmt.get(songId);
        if (!row) {
          continue;
        }
        updateStmt.run(JSON.stringify(updater(parseTags(row.tags))), songId);
      }
    });
    updateMany(ids);
  }
  getCustomFingerings(songId) {
    const rows = this.db.prepare("SELECT * FROM fingerings WHERE song_id = ? ORDER BY note_index ASC").all(songId);
    return rows.map(rowToFingering);
  }
  saveCustomFingering(songId, noteIndex, finger, hand) {
    this.db.prepare(`
        INSERT INTO fingerings (song_id, note_index, finger, hand)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(song_id, note_index) DO UPDATE SET finger = excluded.finger, hand = excluded.hand
      `).run(songId, noteIndex, finger, hand);
  }
  clearCustomFingerings(songId) {
    this.db.prepare("DELETE FROM fingerings WHERE song_id = ?").run(songId);
  }
  getAllFolders() {
    const rows = this.db.prepare("SELECT * FROM folders ORDER BY sort_order ASC, name COLLATE NOCASE ASC").all();
    return rows.map(rowToFolder);
  }
  createFolder(name) {
    const id = randomUUID();
    const sortOrder = this.getNextSortOrder("folders");
    this.db.prepare("INSERT INTO folders (id, name, sort_order) VALUES (?, ?, ?)").run(id, name.trim(), sortOrder);
    return this.getFolder(id);
  }
  renameFolder(folderId, name) {
    this.db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name.trim(), folderId);
  }
  deleteFolder(folderId) {
    const removeFolder = this.db.transaction((targetFolderId) => {
      this.db.prepare("UPDATE songs SET folder_id = NULL WHERE folder_id = ?").run(targetFolderId);
      this.db.prepare("DELETE FROM folders WHERE id = ?").run(targetFolderId);
    });
    removeFolder(folderId);
  }
  getAllPlaylists() {
    const rows = this.db.prepare(`
        SELECT
          playlists.*,
          COUNT(playlist_songs.song_id) AS song_count
        FROM playlists
        LEFT JOIN playlist_songs ON playlist_songs.playlist_id = playlists.id
        GROUP BY playlists.id
        ORDER BY playlists.updated_at DESC, playlists.name COLLATE NOCASE ASC
      `).all();
    return rows.map(rowToPlaylist);
  }
  createPlaylist(name) {
    const id = randomUUID();
    this.db.prepare("INSERT INTO playlists (id, name, description) VALUES (?, ?, '')").run(id, name.trim());
    return this.getPlaylist(id);
  }
  updatePlaylist(playlistId, updates) {
    const fields = ["updated_at = @updatedAt"];
    const params = {
      id: playlistId,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.name !== void 0) {
      fields.push("name = @name");
      params.name = updates.name.trim();
    }
    if (updates.description !== void 0) {
      fields.push("description = @description");
      params.description = updates.description;
    }
    this.db.prepare(`UPDATE playlists SET ${fields.join(", ")} WHERE id = @id`).run(params);
  }
  deletePlaylist(playlistId) {
    this.db.prepare("DELETE FROM playlists WHERE id = ?").run(playlistId);
  }
  getPlaylistSongs(playlistId) {
    const rows = this.db.prepare(`
        SELECT songs.*
        FROM playlist_songs
        INNER JOIN songs ON songs.id = playlist_songs.song_id
        WHERE playlist_songs.playlist_id = ?
        ORDER BY playlist_songs.sort_order ASC, songs.title COLLATE NOCASE ASC
      `).all(playlistId);
    return rows.map(rowToSong);
  }
  addSongToPlaylist(playlistId, songId) {
    const addSong = this.db.transaction((nextPlaylistId, nextSongId) => {
      const current = this.db.prepare("SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?").get(nextPlaylistId, nextSongId);
      if (current) {
        return;
      }
      this.db.prepare("INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)").run(nextPlaylistId, nextSongId, this.getNextPlaylistSortOrder(nextPlaylistId));
      this.touchPlaylist(nextPlaylistId);
    });
    addSong(playlistId, songId);
  }
  bulkAddToPlaylist(songIds, playlistId) {
    const ids = dedupeIds(songIds);
    if (ids.length === 0) {
      return;
    }
    const addMany = this.db.transaction((nextIds, nextPlaylistId) => {
      for (const songId of nextIds) {
        const exists = this.db.prepare("SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?").get(nextPlaylistId, songId);
        if (exists) {
          continue;
        }
        this.db.prepare("INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)").run(nextPlaylistId, songId, this.getNextPlaylistSortOrder(nextPlaylistId));
      }
      this.touchPlaylist(nextPlaylistId);
    });
    addMany(ids, playlistId);
  }
  removeSongFromPlaylist(playlistId, songId) {
    const removeSong = this.db.transaction((nextPlaylistId, nextSongId) => {
      this.db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?").run(nextPlaylistId, nextSongId);
      this.normalizePlaylistSortOrder(nextPlaylistId);
      this.touchPlaylist(nextPlaylistId);
    });
    removeSong(playlistId, songId);
  }
  reorderPlaylistSong(playlistId, songId, newOrder) {
    const reorder = this.db.transaction((nextPlaylistId, nextSongId, nextOrder) => {
      const rows = this.db.prepare("SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC, song_id ASC").all(nextPlaylistId);
      const songIds = rows.map((row) => row.song_id);
      const currentIndex = songIds.indexOf(nextSongId);
      if (currentIndex === -1) {
        return;
      }
      songIds.splice(currentIndex, 1);
      const clampedIndex = Math.max(0, Math.min(nextOrder, songIds.length));
      songIds.splice(clampedIndex, 0, nextSongId);
      const updateStmt = this.db.prepare(
        "UPDATE playlist_songs SET sort_order = ? WHERE playlist_id = ? AND song_id = ?"
      );
      songIds.forEach((entrySongId, index) => {
        updateStmt.run(index, nextPlaylistId, entrySongId);
      });
      this.touchPlaylist(nextPlaylistId);
    });
    reorder(playlistId, songId, newOrder);
  }
  saveGameResult(payload) {
    const id = randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const saveTransaction = this.db.transaction(() => {
      this.db.prepare(`
          INSERT INTO game_results
            (id, song_id, score, accuracy, max_combo, perfect_hits, good_hits, ok_hits,
             misses, timestamp, tempo, mode, duration_sec)
          VALUES
            (@id, @songId, @score, @accuracy, @maxCombo, @perfectHits, @goodHits, @okHits,
             @misses, @timestamp, @tempo, @mode, @durationSec)
        `).run({
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
        durationSec: payload.durationSec
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
          accuracy: entry.accuracy
        });
      }
      const existing = this.db.prepare("SELECT * FROM user_stats WHERE song_id = ?").get(payload.songId);
      if (!existing) {
        this.db.prepare(`
            INSERT INTO user_stats
              (song_id, play_count, best_score, average_score, best_accuracy, last_played, total_practice_time_sec)
            VALUES
              (@songId, 1, @score, @score, @accuracy, @now, @durationSec)
          `).run({
          songId: payload.songId,
          score: payload.score,
          accuracy: payload.accuracy,
          now,
          durationSec: payload.durationSec
        });
      } else {
        const playCount = existing.play_count + 1;
        const bestScore = Math.max(existing.best_score, payload.score);
        const bestAccuracy = Math.max(existing.best_accuracy, payload.accuracy);
        const prevAvg = existing.average_score;
        const prevCount = existing.play_count;
        const newAvg = (prevAvg * prevCount + payload.score) / playCount;
        const totalTime = existing.total_practice_time_sec + payload.durationSec;
        this.db.prepare(`
            UPDATE user_stats SET
              play_count = @playCount,
              best_score = @bestScore,
              average_score = @newAvg,
              best_accuracy = @bestAccuracy,
              last_played = @now,
              total_practice_time_sec = @totalTime
            WHERE song_id = @songId
          `).run({ playCount, bestScore, newAvg, bestAccuracy, now, totalTime, songId: payload.songId });
      }
      this.db.prepare("UPDATE songs SET times_played = times_played + 1 WHERE id = ?").run(payload.songId);
      this.recordPracticeDayEntry(payload.durationSec, 1, 0);
      this.updateTroubleSpotsForSong(payload.songId, payload.measureAccuracy, now);
      return {
        unlockedAchievementIds: this.checkAndUnlockAchievements()
      };
    });
    return saveTransaction();
  }
  getGameResults(songId) {
    const rows = this.db.prepare("SELECT * FROM game_results WHERE song_id = ? ORDER BY timestamp DESC").all(songId);
    return rows.map(rowToGameResult);
  }
  getUserStats(songId) {
    const row = this.db.prepare("SELECT * FROM user_stats WHERE song_id = ?").get(songId);
    return row ? rowToUserStats(row) : null;
  }
  saveTheoryResult(payload) {
    const id = randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const saveTransaction = this.db.transaction(() => {
      this.db.prepare(`
          INSERT INTO theory_results
            (id, type, score, total_questions, accuracy, details, timestamp)
          VALUES
            (@id, @type, @score, @totalQuestions, @accuracy, @details, @timestamp)
        `).run({
        id,
        type: payload.type,
        score: payload.score,
        totalQuestions: payload.totalQuestions,
        accuracy: payload.accuracy,
        details: JSON.stringify(payload.details ?? {}),
        timestamp: now
      });
      this.recordPracticeDayEntry(0, 0, 1);
      return {
        unlockedAchievementIds: this.checkAndUnlockAchievements()
      };
    });
    return saveTransaction();
  }
  getTheoryResults(type, limit = 20) {
    const clampedLimit = Math.max(1, Math.min(limit, 200));
    const rows = type ? this.db.prepare("SELECT * FROM theory_results WHERE type = ? ORDER BY timestamp DESC LIMIT ?").all(type, clampedLimit) : this.db.prepare("SELECT * FROM theory_results ORDER BY timestamp DESC LIMIT ?").all(clampedLimit);
    return rows.map(rowToTheoryResult);
  }
  getTheoryStats(type) {
    const row = this.db.prepare(`
        SELECT
          COUNT(*) AS session_count,
          COALESCE(MAX(score), 0) AS best_score,
          COALESCE(AVG(accuracy), 0) AS average_accuracy,
          MAX(timestamp) AS last_played
        FROM theory_results
        WHERE type = ?
      `).get(type);
    return {
      type,
      sessionCount: row.session_count,
      bestScore: row.best_score,
      averageAccuracy: row.average_accuracy,
      lastPlayed: row.last_played ?? null
    };
  }
  getPracticeDays(fromDate, toDate) {
    const rows = this.db.prepare(`
        SELECT *
        FROM practice_days
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
      `).all(fromDate, toDate);
    return rows.map(rowToPracticeDay);
  }
  recordPracticeTime(durationSec, songsPlayed, theorySessions) {
    this.recordPracticeDayEntry(durationSec, songsPlayed, theorySessions);
  }
  getPracticeStreak() {
    const rows = this.db.prepare("SELECT date FROM practice_days WHERE total_practice_time_sec > 0 OR songs_played > 0 OR theory_sessions > 0 ORDER BY date ASC").all();
    return calculatePracticeStreak(rows.map((row) => row.date), /* @__PURE__ */ new Date());
  }
  getAllAchievements() {
    const rows = this.db.prepare("SELECT * FROM achievements ORDER BY id ASC").all();
    return rows.map(rowToAchievement);
  }
  unlockAchievement(achievementId) {
    this.db.prepare("UPDATE achievements SET unlocked_at = COALESCE(unlocked_at, ?) WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), achievementId);
  }
  getTroubleSpots(songId) {
    const rows = this.db.prepare(`
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
      `).all(songId);
    return rows.map(rowToTroubleSpot);
  }
  updateTroubleSpot(spotId, updates) {
    const fields = [];
    const params = { id: spotId };
    if (updates.measureStart !== void 0) {
      fields.push("measure_start = @measureStart");
      params.measureStart = updates.measureStart;
    }
    if (updates.measureEnd !== void 0) {
      fields.push("measure_end = @measureEnd");
      params.measureEnd = updates.measureEnd;
    }
    if (updates.firstDetected !== void 0) {
      fields.push("first_detected = @firstDetected");
      params.firstDetected = updates.firstDetected;
    }
    if (updates.lastPracticed !== void 0) {
      fields.push("last_practiced = @lastPracticed");
      params.lastPracticed = updates.lastPracticed;
    }
    if (updates.resolutionCount !== void 0) {
      fields.push("resolution_count = @resolutionCount");
      params.resolutionCount = updates.resolutionCount;
    }
    if (updates.isResolved !== void 0) {
      fields.push("is_resolved = @isResolved");
      params.isResolved = updates.isResolved ? 1 : 0;
    }
    if (fields.length === 0) {
      return;
    }
    this.db.prepare(`UPDATE trouble_spots SET ${fields.join(", ")} WHERE id = @id`).run(params);
  }
  getMeasureAccuracyHistory(songId) {
    const rows = this.db.prepare(`
        SELECT mah.*
        FROM measure_accuracy_history mah
        INNER JOIN game_results gr ON gr.id = mah.game_result_id
        WHERE gr.song_id = ?
        ORDER BY gr.timestamp DESC, mah.measure ASC
      `).all(songId);
    return rows.map(rowToMeasureAccuracyHistory);
  }
  getRecommendations() {
    const songs = this.getAllSongs();
    const statsRows = this.db.prepare("SELECT * FROM user_stats").all();
    const userStatsBySongId = Object.fromEntries(statsRows.map((row) => {
      const stats = rowToUserStats(row);
      return [stats.songId, stats];
    }));
    const recentResults30 = this.db.prepare(`
        SELECT *
        FROM game_results
        WHERE datetime(timestamp) >= datetime('now', '-30 days')
        ORDER BY timestamp DESC
      `).all();
    const recentResults60 = this.db.prepare(`
        SELECT *
        FROM game_results
        WHERE datetime(timestamp) >= datetime('now', '-60 days')
        ORDER BY timestamp DESC
      `).all();
    return generateRecommendations({
      songs,
      userStatsBySongId,
      recentResults30: recentResults30.map(rowToGameResult),
      recentResults60: recentResults60.map(rowToGameResult)
    });
  }
  getProgressStats(fromDate, toDate) {
    const practiceRows = this.getPracticeDays(fromDate, toDate);
    const practiceDaysByDate = new Map(practiceRows.map((row) => [row.date, row]));
    const songsPlayedByWeekRows = this.db.prepare(`
        SELECT
          date(date, '-' || ((CAST(strftime('%w', date) AS INTEGER) + 6) % 7) || ' days') AS week_start,
          SUM(songs_played) AS count
        FROM practice_days
        WHERE date BETWEEN ? AND ?
        GROUP BY week_start
        ORDER BY week_start ASC
      `).all(fromDate, toDate);
    const accuracyTrendRows = this.db.prepare(`
        SELECT
          substr(timestamp, 1, 10) AS date,
          AVG(accuracy) AS avg_accuracy
        FROM game_results
        WHERE substr(timestamp, 1, 10) BETWEEN ? AND ?
        GROUP BY substr(timestamp, 1, 10)
        ORDER BY date ASC
      `).all(fromDate, toDate);
    const totalStats = this.db.prepare(`
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
      `).get();
    const hitQualityRow = this.db.prepare(`
        SELECT
          COALESCE(SUM(perfect_hits), 0) AS perfect,
          COALESCE(SUM(good_hits), 0) AS good,
          COALESCE(SUM(ok_hits), 0) AS ok,
          COALESCE(SUM(misses), 0) AS misses
        FROM game_results
        WHERE substr(timestamp, 1, 10) BETWEEN ? AND ?
      `).get(fromDate, toDate);
    return {
      practiceTimeByDay: buildPracticeDaySeries(fromDate, toDate, practiceDaysByDate),
      theorySessionsByDay: buildTheorySessionSeries(fromDate, toDate, practiceDaysByDate),
      songsPlayedByWeek: songsPlayedByWeekRows.map((row) => ({
        weekStart: row.week_start,
        count: row.count
      })),
      accuracyTrend: accuracyTrendRows.map((row) => ({
        date: row.date,
        avgAccuracy: Math.round((row.avg_accuracy ?? 0) * 10) / 10
      })),
      hitQuality: {
        perfect: hitQualityRow.perfect,
        good: hitQualityRow.good,
        ok: hitQualityRow.ok,
        misses: hitQualityRow.misses
      },
      totalStats: {
        totalSongs: totalStats.total_songs,
        songsMastered: totalStats.songs_mastered,
        totalPracticeTimeSec: totalStats.total_practice_time_sec,
        favoriteGenre: totalStats.favorite_genre || "Unspecified"
      }
    };
  }
  getProgressTopSongs(limit = 8) {
    const rows = this.db.prepare(`
        SELECT us.song_id, s.title, us.play_count, us.best_accuracy, us.total_practice_time_sec
        FROM user_stats us
        INNER JOIN songs s ON s.id = us.song_id
        WHERE us.play_count > 0
        ORDER BY us.play_count DESC, us.best_accuracy DESC
        LIMIT ?
      `).all(limit);
    return rows.map((row) => ({
      songId: row.song_id,
      title: row.title,
      playCount: row.play_count,
      bestAccuracy: row.best_accuracy,
      totalPracticeTimeSec: row.total_practice_time_sec
    }));
  }
  getAllUnresolvedTroubleSpots(limit = 8) {
    const rows = this.db.prepare(`
        SELECT
          ts.id,
          ts.song_id,
          s.title AS song_title,
          ts.measure_start,
          ts.measure_end,
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
        INNER JOIN songs s ON s.id = ts.song_id
        WHERE ts.is_resolved = 0
        ORDER BY struggle_count DESC, ts.first_detected ASC
        LIMIT ?
      `).all(limit);
    return rows.map((row) => ({
      id: row.id,
      songId: row.song_id,
      songTitle: row.song_title,
      measureStart: row.measure_start,
      measureEnd: row.measure_end,
      struggleCount: row.struggle_count ?? 0,
      lowestAccuracy: row.lowest_accuracy ?? null,
      latestAccuracy: row.latest_accuracy ?? null
    }));
  }
  recordPracticeDayEntry(durationSec, songsPlayed, theorySessions) {
    const practiceDate = formatLocalDate(/* @__PURE__ */ new Date());
    this.db.prepare(`
        INSERT INTO practice_days (date, total_practice_time_sec, songs_played, theory_sessions)
        VALUES (@date, @durationSec, @songsPlayed, @theorySessions)
        ON CONFLICT(date) DO UPDATE SET
          total_practice_time_sec = total_practice_time_sec + excluded.total_practice_time_sec,
          songs_played = songs_played + excluded.songs_played,
          theory_sessions = theory_sessions + excluded.theory_sessions
      `).run({
      date: practiceDate,
      durationSec,
      songsPlayed,
      theorySessions
    });
  }
  updateTroubleSpotsForSong(songId, measureAccuracy, practicedAt) {
    const existingRows = this.db.prepare("SELECT * FROM trouble_spots WHERE song_id = ? ORDER BY measure_start ASC").all(songId);
    const byMeasure = new Map(existingRows.map((row) => [row.measure_start, row]));
    for (const entry of measureAccuracy) {
      const existing = byMeasure.get(entry.measure);
      if (entry.accuracy < 70) {
        if (!existing) {
          this.db.prepare(`
              INSERT INTO trouble_spots
                (id, song_id, measure_start, measure_end, first_detected, last_practiced, resolution_count, is_resolved)
              VALUES
                (@id, @songId, @measureStart, @measureEnd, @firstDetected, @lastPracticed, 0, 0)
            `).run({
            id: randomUUID(),
            songId,
            measureStart: entry.measure,
            measureEnd: entry.measure,
            firstDetected: practicedAt,
            lastPracticed: practicedAt
          });
          continue;
        }
        this.db.prepare(`
            UPDATE trouble_spots
            SET
              last_practiced = @lastPracticed,
              resolution_count = 0,
              is_resolved = 0
            WHERE id = @id
          `).run({
          id: existing.id,
          lastPracticed: practicedAt
        });
        continue;
      }
      if (!existing) {
        continue;
      }
      if (entry.accuracy > 85) {
        const nextResolutionCount = existing.resolution_count + 1;
        this.db.prepare(`
            UPDATE trouble_spots
            SET
              last_practiced = @lastPracticed,
              resolution_count = @resolutionCount,
              is_resolved = @isResolved
            WHERE id = @id
          `).run({
          id: existing.id,
          lastPracticed: practicedAt,
          resolutionCount: nextResolutionCount,
          isResolved: nextResolutionCount >= 3 ? 1 : 0
        });
      } else {
        this.db.prepare("UPDATE trouble_spots SET last_practiced = ? WHERE id = ?").run(practicedAt, existing.id);
      }
    }
  }
  checkAndUnlockAchievements() {
    const unlockedIds = new Set(
      this.db.prepare("SELECT id FROM achievements WHERE unlocked_at IS NOT NULL").all().map((row) => row.id)
    );
    const metrics = this.buildAchievementMetrics();
    const unlockableIds = getUnlockableAchievementIds(metrics, unlockedIds);
    if (unlockableIds.length === 0) {
      return [];
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const unlockStatement = this.db.prepare("UPDATE achievements SET unlocked_at = COALESCE(unlocked_at, ?) WHERE id = ?");
    for (const achievementId of unlockableIds) {
      unlockStatement.run(now, achievementId);
    }
    return unlockableIds;
  }
  buildAchievementMetrics() {
    const row = this.db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM game_results) AS completed_song_sessions,
          EXISTS(SELECT 1 FROM game_results WHERE accuracy >= 100) AS has_perfect_score,
          (SELECT COUNT(*) FROM theory_results) AS theory_session_count,
          (SELECT COUNT(*) FROM user_stats WHERE best_accuracy >= 90) AS mastered_song_count
      `).get();
    const streak = this.getPracticeStreak();
    return {
      completedSongSessions: row.completed_song_sessions,
      hasPerfectScore: Boolean(row.has_perfect_score),
      currentStreak: streak.currentStreak,
      theorySessionCount: row.theory_session_count,
      masteredSongCount: row.mastered_song_count
    };
  }
  getSetting(category, key) {
    const row = this.db.prepare("SELECT value FROM settings WHERE category = ? AND key = ?").get(category, key);
    return row?.value ?? null;
  }
  getAllSettings() {
    return this.db.prepare("SELECT category, key, value FROM settings ORDER BY category, key").all();
  }
  setSetting(category, key, value) {
    this.db.prepare("INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)").run(category, key, value);
  }
  resetLearningProgress() {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM measure_accuracy_history").run();
      this.db.prepare("DELETE FROM trouble_spots").run();
      this.db.prepare("DELETE FROM game_results").run();
      this.db.prepare("DELETE FROM theory_results").run();
      this.db.prepare("DELETE FROM user_stats").run();
      this.db.prepare("DELETE FROM practice_days").run();
      this.db.prepare("DELETE FROM achievements").run();
      this.db.prepare("DELETE FROM settings WHERE category = 'learning'").run();
      this.db.prepare("UPDATE songs SET times_played = 0").run();
      this.seedAchievements();
    })();
  }
  resetUserData() {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM measure_accuracy_history").run();
      this.db.prepare("DELETE FROM trouble_spots").run();
      this.db.prepare("DELETE FROM game_results").run();
      this.db.prepare("DELETE FROM theory_results").run();
      this.db.prepare("DELETE FROM user_stats").run();
      this.db.prepare("DELETE FROM practice_days").run();
      this.db.prepare("DELETE FROM fingerings").run();
      this.db.prepare("DELETE FROM playlist_songs").run();
      this.db.prepare("DELETE FROM playlists").run();
      this.db.prepare("DELETE FROM folders").run();
      this.db.prepare("DELETE FROM songs").run();
      this.db.prepare("DELETE FROM settings").run();
      this.db.prepare("DELETE FROM achievements").run();
      this.seedAchievements();
    })();
  }
  exportLibraryData() {
    const playlists = this.getAllPlaylists().map((playlist) => ({
      ...playlist,
      songIds: this.db.prepare("SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC").all(playlist.id).map((row) => row.song_id)
    }));
    const fingerings = this.db.prepare("SELECT * FROM fingerings ORDER BY song_id, note_index").all();
    return {
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      songs: this.getAllSongs(),
      folders: this.getAllFolders(),
      playlists,
      fingerings: fingerings.map(rowToFingering),
      settings: this.getAllSettings()
    };
  }
  importLibraryData(backup) {
    const importTransaction = this.db.transaction((nextBackup) => {
      const folderIdMap = /* @__PURE__ */ new Map();
      let foldersImported = 0;
      let playlistsImported = 0;
      for (const folder of nextBackup.folders) {
        const existingByName = this.db.prepare("SELECT id FROM folders WHERE name = ?").get(folder.name);
        const targetId = existingByName?.id ?? folder.id;
        this.db.prepare(`
            INSERT INTO folders (id, name, sort_order, created_at)
            VALUES (@id, @name, @sortOrder, @createdAt)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              sort_order = excluded.sort_order,
              created_at = excluded.created_at
          `).run({
          id: targetId,
          name: folder.name,
          sortOrder: folder.sortOrder,
          createdAt: folder.createdAt
        });
        folderIdMap.set(folder.id, targetId);
        foldersImported += 1;
      }
      for (const song of nextBackup.songs) {
        const targetFolderId = song.folderId ? folderIdMap.get(song.folderId) ?? null : null;
        this.db.prepare(`
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
          `).run({
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
          trackAssignments: JSON.stringify(song.trackAssignments)
        });
      }
      for (const fingering of nextBackup.fingerings) {
        const songExists = this.db.prepare("SELECT 1 FROM songs WHERE id = ?").get(fingering.songId);
        if (!songExists) {
          continue;
        }
        this.saveCustomFingering(fingering.songId, fingering.noteIndex, fingering.finger, fingering.hand);
      }
      for (const setting of nextBackup.settings) {
        this.setSetting(setting.category, setting.key, setting.value);
      }
      for (const playlist of nextBackup.playlists) {
        const existingByName = this.db.prepare("SELECT id FROM playlists WHERE name = ?").get(playlist.name);
        const targetId = existingByName?.id ?? playlist.id;
        this.db.prepare(`
            INSERT INTO playlists (id, name, description, created_at, updated_at)
            VALUES (@id, @name, @description, @createdAt, @updatedAt)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at
          `).run({
          id: targetId,
          name: playlist.name,
          description: playlist.description,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt
        });
        this.db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ?").run(targetId);
        playlist.songIds.forEach((songId, index) => {
          const songExists = this.db.prepare("SELECT 1 FROM songs WHERE id = ?").get(songId);
          if (!songExists) {
            return;
          }
          this.db.prepare("INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)").run(targetId, songId, index);
        });
        this.touchPlaylist(targetId, playlist.updatedAt);
        playlistsImported += 1;
      }
      return {
        songsImported: nextBackup.songs.length,
        foldersImported,
        playlistsImported
      };
    });
    return importTransaction(backup);
  }
  close() {
    this.db.close();
  }
  getFolder(id) {
    const row = this.db.prepare("SELECT * FROM folders WHERE id = ?").get(id);
    return row ? rowToFolder(row) : null;
  }
  getPlaylist(id) {
    const row = this.db.prepare(`
        SELECT playlists.*, COUNT(playlist_songs.song_id) AS song_count
        FROM playlists
        LEFT JOIN playlist_songs ON playlist_songs.playlist_id = playlists.id
        WHERE playlists.id = ?
        GROUP BY playlists.id
      `).get(id);
    return row ? rowToPlaylist(row) : null;
  }
  getNextSortOrder(tableName) {
    const row = this.db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM ${tableName}`).get();
    return row.nextOrder;
  }
  getNextPlaylistSortOrder(playlistId) {
    const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM playlist_songs WHERE playlist_id = ?").get(playlistId);
    return row.nextOrder;
  }
  normalizePlaylistSortOrder(playlistId) {
    const rows = this.db.prepare("SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY sort_order ASC, song_id ASC").all(playlistId);
    const updateStmt = this.db.prepare(
      "UPDATE playlist_songs SET sort_order = ? WHERE playlist_id = ? AND song_id = ?"
    );
    rows.forEach((row, index) => {
      updateStmt.run(index, playlistId, row.song_id);
    });
  }
  touchPlaylist(playlistId, timestamp = (/* @__PURE__ */ new Date()).toISOString()) {
    this.db.prepare("UPDATE playlists SET updated_at = ? WHERE id = ?").run(timestamp, playlistId);
  }
}
function dedupeIds(ids) {
  return [...new Set(ids.filter((id) => id.trim() !== ""))];
}
function normalizeTag(tag) {
  return tag.trim();
}
function parseTags(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string");
  }
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => typeof entry === "string");
    }
  } catch {
  }
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}
function parseTrackAssignments(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed ?? {};
  } catch {
    return {};
  }
}
function rowToSong(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    filePath: row.file_path,
    difficulty: row.difficulty,
    durationSec: row.duration_sec,
    bpm: row.bpm,
    noteCount: row.note_count,
    dateAdded: row.date_added,
    timesPlayed: row.times_played,
    tags: parseTags(row.tags),
    isFavorite: row.is_favorite === 1,
    folderId: row.folder_id ?? null,
    trackAssignments: parseTrackAssignments(row.track_assignments)
  };
}
function rowToFolder(row) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}
function rowToPlaylist(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    songCount: row.song_count
  };
}
function rowToFingering(row) {
  return {
    songId: row.song_id,
    noteIndex: row.note_index,
    finger: row.finger,
    hand: row.hand
  };
}
function rowToGameResult(row) {
  return {
    id: row.id,
    songId: row.song_id,
    score: row.score,
    accuracy: row.accuracy,
    maxCombo: row.max_combo,
    perfectHits: row.perfect_hits,
    goodHits: row.good_hits,
    okHits: row.ok_hits,
    misses: row.misses,
    timestamp: row.timestamp,
    tempo: row.tempo,
    mode: row.mode,
    durationSec: row.duration_sec
  };
}
function rowToPracticeDay(row) {
  return {
    date: row.date,
    totalPracticeTimeSec: row.total_practice_time_sec,
    songsPlayed: row.songs_played,
    theorySessions: row.theory_sessions
  };
}
function rowToUserStats(row) {
  return {
    songId: row.song_id,
    playCount: row.play_count,
    bestScore: row.best_score,
    averageScore: row.average_score,
    bestAccuracy: row.best_accuracy,
    lastPlayed: row.last_played,
    totalPracticeTimeSec: row.total_practice_time_sec
  };
}
function rowToAchievement(row) {
  return {
    id: row.id,
    unlockedAt: row.unlocked_at ?? null
  };
}
function rowToTroubleSpot(row) {
  return {
    id: row.id,
    songId: row.song_id,
    measureStart: row.measure_start,
    measureEnd: row.measure_end,
    firstDetected: row.first_detected,
    lastPracticed: row.last_practiced ?? null,
    resolutionCount: row.resolution_count,
    isResolved: row.is_resolved === 1,
    struggleCount: row.struggle_count ?? 0,
    lowestAccuracy: row.lowest_accuracy ?? null,
    latestAccuracy: row.latest_accuracy ?? null
  };
}
function rowToMeasureAccuracyHistory(row) {
  return {
    id: row.id,
    gameResultId: row.game_result_id,
    measure: row.measure,
    accuracy: row.accuracy
  };
}
function rowToTheoryResult(row) {
  return {
    id: row.id,
    type: row.type,
    score: row.score,
    totalQuestions: row.total_questions,
    accuracy: row.accuracy,
    details: parseJsonObject(row.details),
    timestamp: row.timestamp
  };
}
function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
  }
  return {};
}
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function calculatePracticeStreak(dates, currentDate) {
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0
    };
  }
  const uniqueDates = [...new Set(dates)].sort((left, right) => left.localeCompare(right));
  let longestStreak = 1;
  let runningStreak = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = /* @__PURE__ */ new Date(`${uniqueDates[index - 1]}T00:00:00`);
    const current = /* @__PURE__ */ new Date(`${uniqueDates[index]}T00:00:00`);
    const dayDelta = Math.round((current.getTime() - previous.getTime()) / 864e5);
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
    longestStreak
  };
}
function buildPracticeDaySeries(fromDate, toDate, rowsByDate) {
  const series = [];
  const cursor = /* @__PURE__ */ new Date(`${fromDate}T00:00:00`);
  const end = /* @__PURE__ */ new Date(`${toDate}T00:00:00`);
  while (cursor.getTime() <= end.getTime()) {
    const date = formatLocalDate(cursor);
    const row = rowsByDate.get(date);
    series.push({
      date,
      minutes: Math.round((row?.totalPracticeTimeSec ?? 0) / 60 * 10) / 10
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}
function buildTheorySessionSeries(fromDate, toDate, rowsByDate) {
  const series = [];
  const cursor = /* @__PURE__ */ new Date(`${fromDate}T00:00:00`);
  const end = /* @__PURE__ */ new Date(`${toDate}T00:00:00`);
  while (cursor.getTime() <= end.getTime()) {
    const date = formatLocalDate(cursor);
    const row = rowsByDate.get(date);
    series.push({ date, sessions: row?.theorySessions ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}
let mainWindow = null;
let db;
async function createSongId(buffer) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buffer).digest("hex");
}
function toArrayBuffer(buffer) {
  return Uint8Array.from(buffer).buffer;
}
function collectMidiFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMidiFiles(fullPath));
    } else if (/\.(mid|midi)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}
function calculateDifficulty(noteCount, durationSec) {
  const safeDuration = Math.max(durationSec, 1);
  return Math.max(1, Math.min(10, Math.round(noteCount / safeDuration * 1.2)));
}
function isLibraryBackup(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const backup = value;
  return backup.version === 1 && Array.isArray(backup.songs) && Array.isArray(backup.folders) && Array.isArray(backup.playlists) && Array.isArray(backup.fingerings) && Array.isArray(backup.settings);
}
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    backgroundColor: "#0d0e14",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }
  await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}
app.whenReady().then(async () => {
  app.setAppUserModelId("com.pianohero.app");
  const userDataPath = app.getPath("userData");
  const midiFilesDir = join(userDataPath, "midi-files");
  mkdirSync(midiFilesDir, { recursive: true });
  db = new AppDatabase(join(userDataPath, "pianohero.db"));
  db.migrateFromJson(userDataPath);
  ipcMain.handle("dialog:pick-midi-file", async () => {
    const options = {
      properties: ["openFile"],
      filters: [{ name: "MIDI Files", extensions: ["mid", "midi"] }]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selectedPath = result.filePaths[0];
    const data = new Uint8Array(await readFile(selectedPath));
    return {
      name: selectedPath.split(/[\\/]/).pop() ?? "Imported MIDI",
      path: selectedPath,
      data
    };
  });
  ipcMain.handle("songs:get-all", () => db.getAllSongs());
  ipcMain.handle("songs:get", (_event, songId) => db.getSong(songId));
  ipcMain.handle("songs:add", (_event, payload) => db.addSong(payload));
  ipcMain.handle(
    "songs:update",
    (_event, songId, updates) => db.updateSong(songId, updates)
  );
  ipcMain.handle("songs:delete", (_event, songId) => db.deleteSong(songId));
  ipcMain.handle("songs:toggle-favorite", (_event, songId) => db.toggleFavorite(songId));
  ipcMain.handle("songs:import-midi-files", async () => {
    const options = {
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "MIDI Files", extensions: ["mid", "midi"] }]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    const importedSongs = [];
    for (const selectedPath of result.filePaths) {
      const buffer = await readFile(selectedPath);
      const songId = await createSongId(buffer);
      const destPath = join(midiFilesDir, `${songId}.mid`);
      const title = selectedPath.split(/[\\/]/).pop()?.replace(/\.(mid|midi)$/i, "") ?? "Untitled";
      const parsedSong = parseMidiFile(toArrayBuffer(buffer), { songId, title });
      const difficulty = calculateDifficulty(parsedSong.notes.length, parsedSong.durationSec);
      copyFileSync(selectedPath, destPath);
      const row = db.addSong({
        id: songId,
        title,
        artist: "",
        genre: "",
        filePath: destPath,
        difficulty,
        durationSec: parsedSong.durationSec,
        bpm: parsedSong.bpm,
        noteCount: parsedSong.notes.length,
        tags: [],
        trackAssignments: getTrackAssignments(parsedSong)
      });
      importedSongs.push({
        songId,
        destPath,
        fileData: new Uint8Array(buffer),
        title: row.title,
        durationSec: row.durationSec,
        bpm: row.bpm,
        noteCount: row.noteCount,
        difficulty: row.difficulty
      });
    }
    return importedSongs;
  });
  ipcMain.handle("songs:import-folder", async () => {
    const options = {
      properties: ["openDirectory"]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePaths = collectMidiFiles(result.filePaths[0]);
    const importedSongs = [];
    let skipped = 0;
    for (const selectedPath of filePaths) {
      const buffer = await readFile(selectedPath);
      const songId = await createSongId(buffer);
      if (db.getSong(songId)) {
        skipped++;
        continue;
      }
      const destPath = join(midiFilesDir, `${songId}.mid`);
      const title = selectedPath.split(/[\\/]/).pop()?.replace(/\.(mid|midi)$/i, "") ?? "Untitled";
      const parsedSong = parseMidiFile(toArrayBuffer(buffer), { songId, title });
      const difficulty = calculateDifficulty(parsedSong.notes.length, parsedSong.durationSec);
      copyFileSync(selectedPath, destPath);
      const row = db.addSong({
        id: songId,
        title,
        artist: "",
        genre: "",
        filePath: destPath,
        difficulty,
        durationSec: parsedSong.durationSec,
        bpm: parsedSong.bpm,
        noteCount: parsedSong.notes.length,
        tags: [],
        trackAssignments: getTrackAssignments(parsedSong)
      });
      importedSongs.push({
        songId,
        destPath,
        fileData: new Uint8Array(buffer),
        title: row.title,
        durationSec: row.durationSec,
        bpm: row.bpm,
        noteCount: row.noteCount,
        difficulty: row.difficulty
      });
    }
    return { imported: importedSongs, skipped };
  });
  ipcMain.handle("results:save", (_event, payload) => db.saveGameResult(payload));
  ipcMain.handle("results:for-song", (_event, songId) => db.getGameResults(songId));
  ipcMain.handle("stats:get", (_event, songId) => db.getUserStats(songId));
  ipcMain.handle("theory:save-result", (_event, payload) => db.saveTheoryResult(payload));
  ipcMain.handle(
    "theory:get-results",
    (_event, type, limit) => db.getTheoryResults(type, limit)
  );
  ipcMain.handle("theory:get-stats", (_event, type) => db.getTheoryStats(type));
  ipcMain.handle(
    "practice:get-days",
    (_event, fromDate, toDate) => db.getPracticeDays(fromDate, toDate)
  );
  ipcMain.handle(
    "practice:record-time",
    (_event, durationSec, songsPlayed, theorySessions) => db.recordPracticeTime(durationSec, songsPlayed, theorySessions)
  );
  ipcMain.handle("practice:get-streak", () => db.getPracticeStreak());
  ipcMain.handle("achievements:get-all", () => db.getAllAchievements());
  ipcMain.handle("achievements:unlock", (_event, achievementId) => db.unlockAchievement(achievementId));
  ipcMain.handle("trouble-spots:get", (_event, songId) => db.getTroubleSpots(songId));
  ipcMain.handle(
    "trouble-spots:update",
    (_event, spotId, updates) => db.updateTroubleSpot(spotId, updates)
  );
  ipcMain.handle("measure-accuracy:get-history", (_event, songId) => db.getMeasureAccuracyHistory(songId));
  ipcMain.handle("recommendations:get", () => db.getRecommendations());
  ipcMain.handle(
    "progress:get-stats",
    (_event, fromDate, toDate) => db.getProgressStats(fromDate, toDate)
  );
  ipcMain.handle("progress:get-top-songs", () => db.getProgressTopSongs());
  ipcMain.handle("trouble-spots:get-all-unresolved", () => db.getAllUnresolvedTroubleSpots());
  ipcMain.handle("fingerings:get", (_event, songId) => db.getCustomFingerings(songId));
  ipcMain.handle(
    "fingerings:save",
    (_event, songId, noteIndex, finger, hand) => db.saveCustomFingering(songId, noteIndex, finger, hand)
  );
  ipcMain.handle("fingerings:clear", (_event, songId) => db.clearCustomFingerings(songId));
  ipcMain.handle("folders:get-all", () => db.getAllFolders());
  ipcMain.handle("folders:create", (_event, name) => db.createFolder(name));
  ipcMain.handle("folders:rename", (_event, folderId, name) => db.renameFolder(folderId, name));
  ipcMain.handle("folders:delete", (_event, folderId) => db.deleteFolder(folderId));
  ipcMain.handle(
    "folders:move-song",
    (_event, songId, folderId) => db.moveSongToFolder(songId, folderId)
  );
  ipcMain.handle("playlists:get-all", () => db.getAllPlaylists());
  ipcMain.handle("playlists:create", (_event, name) => db.createPlaylist(name));
  ipcMain.handle(
    "playlists:update",
    (_event, playlistId, updates) => db.updatePlaylist(playlistId, updates)
  );
  ipcMain.handle("playlists:delete", (_event, playlistId) => db.deletePlaylist(playlistId));
  ipcMain.handle("playlists:get-songs", (_event, playlistId) => db.getPlaylistSongs(playlistId));
  ipcMain.handle(
    "playlists:add-song",
    (_event, playlistId, songId) => db.addSongToPlaylist(playlistId, songId)
  );
  ipcMain.handle(
    "playlists:remove-song",
    (_event, playlistId, songId) => db.removeSongFromPlaylist(playlistId, songId)
  );
  ipcMain.handle(
    "playlists:reorder-song",
    (_event, playlistId, songId, newOrder) => db.reorderPlaylistSong(playlistId, songId, newOrder)
  );
  ipcMain.handle("bulk:delete-songs", (_event, songIds) => db.bulkDeleteSongs(songIds));
  ipcMain.handle(
    "bulk:move-songs-to-folder",
    (_event, songIds, folderId) => db.bulkMoveSongsToFolder(songIds, folderId)
  );
  ipcMain.handle("bulk:add-tag", (_event, songIds, tag) => db.bulkAddTag(songIds, tag));
  ipcMain.handle("bulk:remove-tag", (_event, songIds, tag) => db.bulkRemoveTag(songIds, tag));
  ipcMain.handle(
    "bulk:add-to-playlist",
    (_event, songIds, playlistId) => db.bulkAddToPlaylist(songIds, playlistId)
  );
  ipcMain.handle(
    "settings:get",
    (_event, category, key) => db.getSetting(category, key)
  );
  ipcMain.handle(
    "settings:set",
    (_event, category, key, value) => db.setSetting(category, key, value)
  );
  ipcMain.handle("settings:reset-learning-progress", () => {
    db.resetLearningProgress();
  });
  ipcMain.handle("settings:reset-user-data", () => {
    db.resetUserData();
    rmSync(midiFilesDir, { recursive: true, force: true });
    mkdirSync(midiFilesDir, { recursive: true });
  });
  ipcMain.handle("library:export", async () => {
    const options = {
      defaultPath: `pianohero-library-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    const backup = db.exportLibraryData();
    writeFileSync(result.filePath, JSON.stringify(backup, null, 2), "utf8");
    return result.filePath;
  });
  ipcMain.handle("library:import", async () => {
    const options = {
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const raw = JSON.parse(await readFile(result.filePaths[0], "utf8"));
    if (!isLibraryBackup(raw)) {
      throw new Error("Invalid library backup file.");
    }
    return db.importLibraryData(raw);
  });
  ipcMain.handle("file:load-midi", async (_event, selectedPath) => {
    const data = await readFile(selectedPath);
    return new Uint8Array(data);
  });
  ipcMain.handle("file:save-midi", async (_event, suggestedName, data) => {
    const options = {
      defaultPath: suggestedName,
      filters: [{ name: "MIDI Files", extensions: ["mid"] }]
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    writeFileSync(result.filePath, Buffer.from(data));
    return result.filePath;
  });
  ipcMain.handle("file:save-wav", async (_event, suggestedName, data) => {
    const options = {
      defaultPath: suggestedName,
      filters: [{ name: "WAV Audio", extensions: ["wav"] }]
    };
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    writeFileSync(result.filePath, Buffer.from(data));
    return result.filePath;
  });
  ipcMain.handle("file:pick-audio", async () => {
    const options = {
      properties: ["openFile"],
      filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "flac", "m4a"] }]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const name = filePath.split(/[\\/]/).pop() ?? "audio";
    return { path: filePath, name };
  });
  ipcMain.handle("file:pick-sample-dir", async () => {
    const options = {
      properties: ["openDirectory"]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
  ipcMain.handle("file:list-audio", (_event, dir) => {
    try {
      const audioExtensions = /* @__PURE__ */ new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a"]);
      return readdirSync(dir).filter((file) => {
        const lower = file.toLowerCase();
        return audioExtensions.has(lower.slice(lower.lastIndexOf(".")));
      });
    } catch {
      return [];
    }
  });
  await createMainWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("before-quit", () => {
  if (db) {
    db.close();
  }
});
