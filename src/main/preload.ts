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
  importMidiFolder: () => ipcRenderer.invoke('songs:import-folder'),

  saveGameResult: (payload) => ipcRenderer.invoke('results:save', payload),
  getGameResults: (songId) => ipcRenderer.invoke('results:for-song', songId),
  getUserStats: (songId) => ipcRenderer.invoke('stats:get', songId),
  saveTheoryResult: (payload) => ipcRenderer.invoke('theory:save-result', payload),
  getTheoryResults: (type, limit) => ipcRenderer.invoke('theory:get-results', type, limit),
  getTheoryStats: (type) => ipcRenderer.invoke('theory:get-stats', type),

  getPracticeDays: (fromDate, toDate) => ipcRenderer.invoke('practice:get-days', fromDate, toDate),
  recordPracticeTime: (durationSec, songsPlayed, theorySessions) =>
    ipcRenderer.invoke('practice:record-time', durationSec, songsPlayed, theorySessions),
  getPracticeStreak: () => ipcRenderer.invoke('practice:get-streak'),

  getAllAchievements: () => ipcRenderer.invoke('achievements:get-all'),
  unlockAchievement: (achievementId) => ipcRenderer.invoke('achievements:unlock', achievementId),

  getTroubleSpots: (songId) => ipcRenderer.invoke('trouble-spots:get', songId),
  updateTroubleSpot: (spotId, updates) => ipcRenderer.invoke('trouble-spots:update', spotId, updates),
  getMeasureAccuracyHistory: (songId) => ipcRenderer.invoke('measure-accuracy:get-history', songId),

  getRecommendations: () => ipcRenderer.invoke('recommendations:get'),
  getProgressStats: (fromDate, toDate) => ipcRenderer.invoke('progress:get-stats', fromDate, toDate),
  getProgressTopSongs: () => ipcRenderer.invoke('progress:get-top-songs'),
  getAllUnresolvedTroubleSpots: () => ipcRenderer.invoke('trouble-spots:get-all-unresolved'),

  getCustomFingerings: (songId) => ipcRenderer.invoke('fingerings:get', songId),
  saveCustomFingering: (songId, noteIndex, finger, hand) =>
    ipcRenderer.invoke('fingerings:save', songId, noteIndex, finger, hand),
  clearCustomFingerings: (songId) => ipcRenderer.invoke('fingerings:clear', songId),

  getAllFolders: () => ipcRenderer.invoke('folders:get-all'),
  createFolder: (name) => ipcRenderer.invoke('folders:create', name),
  renameFolder: (folderId, name) => ipcRenderer.invoke('folders:rename', folderId, name),
  deleteFolder: (folderId) => ipcRenderer.invoke('folders:delete', folderId),
  moveSongToFolder: (songId, folderId) => ipcRenderer.invoke('folders:move-song', songId, folderId),

  getAllPlaylists: () => ipcRenderer.invoke('playlists:get-all'),
  createPlaylist: (name) => ipcRenderer.invoke('playlists:create', name),
  updatePlaylist: (playlistId, updates) => ipcRenderer.invoke('playlists:update', playlistId, updates),
  deletePlaylist: (playlistId) => ipcRenderer.invoke('playlists:delete', playlistId),
  getPlaylistSongs: (playlistId) => ipcRenderer.invoke('playlists:get-songs', playlistId),
  addSongToPlaylist: (playlistId, songId) => ipcRenderer.invoke('playlists:add-song', playlistId, songId),
  removeSongFromPlaylist: (playlistId, songId) =>
    ipcRenderer.invoke('playlists:remove-song', playlistId, songId),
  reorderPlaylistSong: (playlistId, songId, newOrder) =>
    ipcRenderer.invoke('playlists:reorder-song', playlistId, songId, newOrder),

  bulkDeleteSongs: (songIds) => ipcRenderer.invoke('bulk:delete-songs', songIds),
  bulkMoveSongsToFolder: (songIds, folderId) =>
    ipcRenderer.invoke('bulk:move-songs-to-folder', songIds, folderId),
  bulkAddTag: (songIds, tag) => ipcRenderer.invoke('bulk:add-tag', songIds, tag),
  bulkRemoveTag: (songIds, tag) => ipcRenderer.invoke('bulk:remove-tag', songIds, tag),
  bulkAddToPlaylist: (songIds, playlistId) => ipcRenderer.invoke('bulk:add-to-playlist', songIds, playlistId),

  getSetting: (category, key) => ipcRenderer.invoke('settings:get', category, key),
  setSetting: (category, key, value) => ipcRenderer.invoke('settings:set', category, key, value),
  resetLearningProgress: () => ipcRenderer.invoke('settings:reset-learning-progress'),
  resetUserData: () => ipcRenderer.invoke('settings:reset-user-data'),
  exportLibrary: () => ipcRenderer.invoke('library:export'),
  importLibrary: () => ipcRenderer.invoke('library:import'),

  loadMidiFileData: (filePath) => ipcRenderer.invoke('file:load-midi', filePath),
  saveMidiFile: (suggestedName, data) => ipcRenderer.invoke('file:save-midi', suggestedName, data),
  saveWavFile: (suggestedName, data) => ipcRenderer.invoke('file:save-wav', suggestedName, data),
  pickAudioFile: () => ipcRenderer.invoke('file:pick-audio'),
  pickSampleDirectory: () => ipcRenderer.invoke('file:pick-sample-dir'),
  listAudioFiles: (dir) => ipcRenderer.invoke('file:list-audio', dir),
};

contextBridge.exposeInMainWorld('appBridge', appBridge);
