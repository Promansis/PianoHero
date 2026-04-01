import { app, ipcMain, dialog, BrowserWindow } from "electron";
import { existsSync, readFileSync, renameSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
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
          (id, title, artist, genre, file_path, difficulty, duration_sec, bpm, note_count, tags, track_assignments)
        VALUES
          (@id, @title, @artist, @genre, @filePath, @difficulty, @durationSec, @bpm, @noteCount, @tags, @trackAssignments)
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
      trackAssignments: JSON.stringify(payload.trackAssignments)
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
  toggleFavorite(id) {
    this.db.prepare("UPDATE songs SET is_favorite = 1 - is_favorite WHERE id = ?").run(id);
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
    });
    saveTransaction();
  }
  getGameResults(songId) {
    const rows = this.db.prepare("SELECT * FROM game_results WHERE song_id = ? ORDER BY timestamp DESC").all(songId);
    return rows.map(rowToGameResult);
  }
  getUserStats(songId) {
    const row = this.db.prepare("SELECT * FROM user_stats WHERE song_id = ?").get(songId);
    return row ? rowToUserStats(row) : null;
  }
  getSetting(category, key) {
    const row = this.db.prepare("SELECT value FROM settings WHERE category = ? AND key = ?").get(category, key);
    return row?.value ?? null;
  }
  setSetting(category, key, value) {
    this.db.prepare("INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)").run(category, key, value);
  }
  close() {
    this.db.close();
  }
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
    trackAssignments: parseTrackAssignments(row.track_assignments)
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
let mainWindow = null;
let db;
async function createSongId(buffer) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buffer).digest("hex");
}
function toArrayBuffer(buffer) {
  return Uint8Array.from(buffer).buffer;
}
function calculateDifficulty(noteCount, durationSec) {
  const safeDuration = Math.max(durationSec, 1);
  return Math.max(1, Math.min(10, Math.round(noteCount / safeDuration * 1.2)));
}
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    backgroundColor: "#f2eadb",
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
  ipcMain.handle("results:save", (_event, payload) => {
    db.saveGameResult(payload);
  });
  ipcMain.handle("results:for-song", (_event, songId) => db.getGameResults(songId));
  ipcMain.handle("stats:get", (_event, songId) => db.getUserStats(songId));
  ipcMain.handle(
    "settings:get",
    (_event, category, key) => db.getSetting(category, key)
  );
  ipcMain.handle(
    "settings:set",
    (_event, category, key, value) => db.setSetting(category, key, value)
  );
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
