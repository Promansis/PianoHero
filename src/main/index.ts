import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTrackAssignments } from '../lib/game/songUtils';
import { parseMidiFile } from '../lib/midi/midiFileParser';
import type {
  AddSongPayload,
  FingeringRow,
  LibraryBackup,
  SaveGameResultPayload,
  SaveTheoryResultPayload,
  TheoryResultRow,
} from '../shared/dbTypes';
import { AppDatabase } from './database';

let mainWindow: BrowserWindow | null = null;
let db: AppDatabase;

async function createSongId(buffer: Buffer): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(buffer).digest('hex');
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

function calculateDifficulty(noteCount: number, durationSec: number): number {
  const safeDuration = Math.max(durationSec, 1);
  return Math.max(1, Math.min(10, Math.round((noteCount / safeDuration) * 1.2)));
}

function isLibraryBackup(value: unknown): value is LibraryBackup {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const backup = value as Partial<LibraryBackup>;
  return (
    backup.version === 1 &&
    Array.isArray(backup.songs) &&
    Array.isArray(backup.folders) &&
    Array.isArray(backup.playlists) &&
    Array.isArray(backup.fingerings) &&
    Array.isArray(backup.settings)
  );
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    backgroundColor: '#f2eadb',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.pianohero.app');

  const userDataPath = app.getPath('userData');
  const midiFilesDir = join(userDataPath, 'midi-files');
  mkdirSync(midiFilesDir, { recursive: true });

  db = new AppDatabase(join(userDataPath, 'pianohero.db'));
  db.migrateFromJson(userDataPath);

  ipcMain.handle('dialog:pick-midi-file', async () => {
    const options: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'MIDI Files', extensions: ['mid', 'midi'] }],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    const data = new Uint8Array(await readFile(selectedPath));
    return {
      name: selectedPath.split(/[\\/]/).pop() ?? 'Imported MIDI',
      path: selectedPath,
      data,
    };
  });

  ipcMain.handle('songs:get-all', () => db.getAllSongs());
  ipcMain.handle('songs:get', (_event, songId: string) => db.getSong(songId));
  ipcMain.handle('songs:add', (_event, payload: AddSongPayload) => db.addSong(payload));
  ipcMain.handle(
    'songs:update',
    (_event, songId: string, updates: Partial<Omit<Parameters<AppDatabase['updateSong']>[1], never>>) =>
      db.updateSong(songId, updates),
  );
  ipcMain.handle('songs:delete', (_event, songId: string) => db.deleteSong(songId));
  ipcMain.handle('songs:toggle-favorite', (_event, songId: string) => db.toggleFavorite(songId));

  ipcMain.handle('songs:import-midi-files', async () => {
    const options: OpenDialogOptions = {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'MIDI Files', extensions: ['mid', 'midi'] }],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    const importedSongs = [];
    for (const selectedPath of result.filePaths) {
      const buffer = await readFile(selectedPath);
      const songId = await createSongId(buffer);
      const destPath = join(midiFilesDir, `${songId}.mid`);
      const title = selectedPath.split(/[\\/]/).pop()?.replace(/\.(mid|midi)$/i, '') ?? 'Untitled';
      const parsedSong = parseMidiFile(toArrayBuffer(buffer), { songId, title });
      const difficulty = calculateDifficulty(parsedSong.notes.length, parsedSong.durationSec);

      copyFileSync(selectedPath, destPath);
      const row = db.addSong({
        id: songId,
        title,
        artist: '',
        genre: '',
        filePath: destPath,
        difficulty,
        durationSec: parsedSong.durationSec,
        bpm: parsedSong.bpm,
        noteCount: parsedSong.notes.length,
        tags: [],
        trackAssignments: getTrackAssignments(parsedSong),
      });

      importedSongs.push({
        songId,
        destPath,
        fileData: new Uint8Array(buffer),
        title: row.title,
        durationSec: row.durationSec,
        bpm: row.bpm,
        noteCount: row.noteCount,
        difficulty: row.difficulty,
      });
    }

    return importedSongs;
  });

  ipcMain.handle('results:save', (_event, payload: SaveGameResultPayload) => {
    db.saveGameResult(payload);
  });
  ipcMain.handle('results:for-song', (_event, songId: string) => db.getGameResults(songId));
  ipcMain.handle('stats:get', (_event, songId: string) => db.getUserStats(songId));
  ipcMain.handle('theory:save-result', (_event, payload: SaveTheoryResultPayload) => {
    db.saveTheoryResult(payload);
  });
  ipcMain.handle('theory:get-results', (_event, type?: TheoryResultRow['type'], limit?: number) =>
    db.getTheoryResults(type, limit),
  );
  ipcMain.handle('theory:get-stats', (_event, type: TheoryResultRow['type']) => db.getTheoryStats(type));

  ipcMain.handle('fingerings:get', (_event, songId: string) => db.getCustomFingerings(songId));
  ipcMain.handle(
    'fingerings:save',
    (_event, songId: string, noteIndex: number, finger: number, hand: FingeringRow['hand']) =>
      db.saveCustomFingering(songId, noteIndex, finger, hand),
  );
  ipcMain.handle('fingerings:clear', (_event, songId: string) => db.clearCustomFingerings(songId));

  ipcMain.handle('folders:get-all', () => db.getAllFolders());
  ipcMain.handle('folders:create', (_event, name: string) => db.createFolder(name));
  ipcMain.handle('folders:rename', (_event, folderId: string, name: string) => db.renameFolder(folderId, name));
  ipcMain.handle('folders:delete', (_event, folderId: string) => db.deleteFolder(folderId));
  ipcMain.handle('folders:move-song', (_event, songId: string, folderId: string | null) =>
    db.moveSongToFolder(songId, folderId),
  );

  ipcMain.handle('playlists:get-all', () => db.getAllPlaylists());
  ipcMain.handle('playlists:create', (_event, name: string) => db.createPlaylist(name));
  ipcMain.handle(
    'playlists:update',
    (_event, playlistId: string, updates: Partial<{ name: string; description: string }>) =>
      db.updatePlaylist(playlistId, updates),
  );
  ipcMain.handle('playlists:delete', (_event, playlistId: string) => db.deletePlaylist(playlistId));
  ipcMain.handle('playlists:get-songs', (_event, playlistId: string) => db.getPlaylistSongs(playlistId));
  ipcMain.handle('playlists:add-song', (_event, playlistId: string, songId: string) =>
    db.addSongToPlaylist(playlistId, songId),
  );
  ipcMain.handle('playlists:remove-song', (_event, playlistId: string, songId: string) =>
    db.removeSongFromPlaylist(playlistId, songId),
  );
  ipcMain.handle('playlists:reorder-song', (_event, playlistId: string, songId: string, newOrder: number) =>
    db.reorderPlaylistSong(playlistId, songId, newOrder),
  );

  ipcMain.handle('bulk:delete-songs', (_event, songIds: string[]) => db.bulkDeleteSongs(songIds));
  ipcMain.handle('bulk:move-songs-to-folder', (_event, songIds: string[], folderId: string | null) =>
    db.bulkMoveSongsToFolder(songIds, folderId),
  );
  ipcMain.handle('bulk:add-tag', (_event, songIds: string[], tag: string) => db.bulkAddTag(songIds, tag));
  ipcMain.handle('bulk:remove-tag', (_event, songIds: string[], tag: string) => db.bulkRemoveTag(songIds, tag));
  ipcMain.handle('bulk:add-to-playlist', (_event, songIds: string[], playlistId: string) =>
    db.bulkAddToPlaylist(songIds, playlistId),
  );

  ipcMain.handle('settings:get', (_event, category: string, key: string) =>
    db.getSetting(category, key),
  );
  ipcMain.handle('settings:set', (_event, category: string, key: string, value: string) =>
    db.setSetting(category, key, value),
  );

  ipcMain.handle('library:export', async () => {
    const options: SaveDialogOptions = {
      defaultPath: `pianohero-library-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    };
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return null;
    }

    const backup = db.exportLibraryData();
    writeFileSync(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
    return result.filePath;
  });

  ipcMain.handle('library:import', async () => {
    const options: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const raw = JSON.parse(await readFile(result.filePaths[0], 'utf8')) as unknown;
    if (!isLibraryBackup(raw)) {
      throw new Error('Invalid library backup file.');
    }

    return db.importLibraryData(raw);
  });

  ipcMain.handle('file:load-midi', async (_event, selectedPath: string) => {
    const data = await readFile(selectedPath);
    return new Uint8Array(data);
  });

  ipcMain.handle('file:save-midi', async (_event, suggestedName: string, data: Uint8Array) => {
    const options: SaveDialogOptions = {
      defaultPath: suggestedName,
      filters: [{ name: 'MIDI Files', extensions: ['mid'] }],
    };
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return null;
    }

    writeFileSync(result.filePath, Buffer.from(data));
    return result.filePath;
  });

  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});
