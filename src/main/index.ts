import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { OpenDialogOptions } from 'electron';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SongMetadataStore } from './songMetadataStore';
import type { SongMetadata } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;
let metadataStore: SongMetadataStore;

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    backgroundColor: '#f2eadb',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.pianohero.app');
  metadataStore = new SongMetadataStore(app.getPath('userData'));

  ipcMain.handle('dialog:pick-midi-file', async () => {
    const options: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        {
          name: 'MIDI Files',
          extensions: ['mid', 'midi'],
        },
      ],
    };

    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const data = new Uint8Array(await readFile(filePath));

    return {
      name: filePath.split(/[\\/]/).pop() ?? 'Imported MIDI',
      path: filePath,
      data,
    };
  });

  ipcMain.handle('song-metadata:get', async (_event, songId: string) => metadataStore.get(songId));
  ipcMain.handle('song-metadata:set', async (_event, songId: string, metadata: SongMetadata) => {
    await metadataStore.set(songId, metadata);
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
