import { app, ipcMain, dialog, BrowserWindow } from "electron";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const EMPTY_STORE = {
  songs: {}
};
class SongMetadataStore {
  storePath;
  constructor(userDataPath) {
    this.storePath = join(userDataPath, "song-metadata.json");
  }
  async get(songId) {
    const store = await this.readStore();
    return store.songs[songId] ?? null;
  }
  async set(songId, metadata) {
    const store = await this.readStore();
    store.songs[songId] = metadata;
    await this.writeStore(store);
  }
  async readStore() {
    try {
      const contents = await readFile(this.storePath, "utf8");
      const parsed = JSON.parse(contents);
      return {
        songs: parsed.songs ?? {}
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return EMPTY_STORE;
      }
      throw error;
    }
  }
  async writeStore(store) {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, JSON.stringify(store, null, 2), "utf8");
  }
}
let mainWindow = null;
let metadataStore;
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    backgroundColor: "#f2eadb",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(async () => {
  app.setAppUserModelId("com.pianohero.app");
  metadataStore = new SongMetadataStore(app.getPath("userData"));
  ipcMain.handle("dialog:pick-midi-file", async () => {
    const options = {
      properties: ["openFile"],
      filters: [
        {
          name: "MIDI Files",
          extensions: ["mid", "midi"]
        }
      ]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const data = new Uint8Array(await readFile(filePath));
    return {
      name: filePath.split(/[\\/]/).pop() ?? "Imported MIDI",
      path: filePath,
      data
    };
  });
  ipcMain.handle("song-metadata:get", async (_event, songId) => metadataStore.get(songId));
  ipcMain.handle("song-metadata:set", async (_event, songId, metadata) => {
    await metadataStore.set(songId, metadata);
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
