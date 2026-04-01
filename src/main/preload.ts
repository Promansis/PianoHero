import { contextBridge, ipcRenderer } from 'electron';
import type { AppBridge, PickedMidiFile } from '../shared/ipc';

const appBridge: AppBridge = {
  pickMidiFile: () => ipcRenderer.invoke('dialog:pick-midi-file') as Promise<PickedMidiFile | null>,

  getAllSongs: () => ipcRenderer.invoke('songs:get-all'),
  getSong: (songId) => ipcRenderer.invoke('songs:get', songId),
  addSong: (song) => ipcRenderer.invoke('songs:add', song),
  updateSong: (songId, updates) => ipcRenderer.invoke('songs:update', songId, updates),
  deleteSong: (songId) => ipcRenderer.invoke('songs:delete', songId),
  toggleFavorite: (songId) => ipcRenderer.invoke('songs:toggle-favorite', songId),
  importMidiFiles: () => ipcRenderer.invoke('songs:import-midi-files'),

  saveGameResult: (payload) => ipcRenderer.invoke('results:save', payload),
  getGameResults: (songId) => ipcRenderer.invoke('results:for-song', songId),
  getUserStats: (songId) => ipcRenderer.invoke('stats:get', songId),

  getSetting: (category, key) => ipcRenderer.invoke('settings:get', category, key),
  setSetting: (category, key, value) => ipcRenderer.invoke('settings:set', category, key, value),

  loadMidiFileData: (filePath) => ipcRenderer.invoke('file:load-midi', filePath),
  saveMidiFile: (suggestedName, data) => ipcRenderer.invoke('file:save-midi', suggestedName, data),
};

contextBridge.exposeInMainWorld('appBridge', appBridge);
