import { contextBridge, ipcRenderer } from "electron";
const appBridge = {
  pickMidiFile: () => ipcRenderer.invoke("dialog:pick-midi-file"),
  getSongMetadata: (songId) => ipcRenderer.invoke("song-metadata:get", songId),
  saveSongMetadata: (songId, metadata) => ipcRenderer.invoke("song-metadata:set", songId, metadata)
};
contextBridge.exposeInMainWorld("appBridge", appBridge);
