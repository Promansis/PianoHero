import type { AppBridge } from './ipc';

export const APP_BRIDGE_METHODS = [
  'pickMidiFile',
  'getAllSongs',
  'getSong',
  'addSong',
  'updateSong',
  'deleteSong',
  'toggleFavorite',
  'importMidiFiles',
  'importMidiFolder',
  'reattachMidiFile',
  'recomputeAllSongDifficulties',
  'onImportProgress',
  'saveGameResult',
  'getGameResults',
  'getUserStats',
  'saveTheoryResult',
  'getTheoryResults',
  'getTheoryStats',
  'getPracticeDays',
  'recordPracticeTime',
  'getPracticeStreak',
  'getAllAchievements',
  'unlockAchievement',
  'getTroubleSpots',
  'updateTroubleSpot',
  'getMeasureAccuracyHistory',
  'getRecommendations',
  'getProgressStats',
  'getProgressTopSongs',
  'getAllUnresolvedTroubleSpots',
  'getLibrarySnapshot',
  'getCustomFingerings',
  'saveCustomFingering',
  'clearCustomFingerings',
  'getAllFolders',
  'createFolder',
  'renameFolder',
  'deleteFolder',
  'moveSongToFolder',
  'getAllPlaylists',
  'createPlaylist',
  'updatePlaylist',
  'deletePlaylist',
  'getPlaylistSongs',
  'addSongToPlaylist',
  'removeSongFromPlaylist',
  'reorderPlaylistSong',
  'bulkDeleteSongs',
  'bulkMoveSongsToFolder',
  'bulkAddTag',
  'bulkRemoveTag',
  'bulkAddToPlaylist',
  'getSetting',
  'setSetting',
  'resetLearningProgress',
  'resetUserData',
  'exportLibrary',
  'importLibrary',
  'loadMidiFileData',
  'loadCurriculumMidi',
  'saveMidiFile',
  'saveWavFile',
  'pickAudioFile',
  'pickSampleDirectory',
  'listAudioFiles',
  'getInstrumentSamplePackStatuses',
  'installInstrumentSamplePack',
  'removeInstrumentSamplePack',
  'resolveInstrumentSampleSource',
] as const satisfies ReadonlyArray<keyof AppBridge>;

export type AppBridgeMethod = (typeof APP_BRIDGE_METHODS)[number];

type AssertNever<T extends never> = T;

export type AppBridgeMethodInventoryCoversContract = AssertNever<
  Exclude<keyof AppBridge, AppBridgeMethod>
>;

export type AppBridgeMethodInventoryHasNoUnknownMethods = AssertNever<
  Exclude<AppBridgeMethod, keyof AppBridge>
>;

export const RPC_BRIDGE_METHODS = [
  'getAllSongs',
  'getSong',
  'addSong',
  'updateSong',
  'deleteSong',
  'toggleFavorite',
  'recomputeAllSongDifficulties',
  'saveGameResult',
  'getGameResults',
  'getUserStats',
  'saveTheoryResult',
  'getTheoryResults',
  'getTheoryStats',
  'getPracticeDays',
  'recordPracticeTime',
  'getPracticeStreak',
  'getAllAchievements',
  'unlockAchievement',
  'getTroubleSpots',
  'updateTroubleSpot',
  'getMeasureAccuracyHistory',
  'getRecommendations',
  'getProgressStats',
  'getProgressTopSongs',
  'getAllUnresolvedTroubleSpots',
  'getLibrarySnapshot',
  'getCustomFingerings',
  'saveCustomFingering',
  'clearCustomFingerings',
  'getAllFolders',
  'createFolder',
  'renameFolder',
  'deleteFolder',
  'moveSongToFolder',
  'getAllPlaylists',
  'createPlaylist',
  'updatePlaylist',
  'deletePlaylist',
  'getPlaylistSongs',
  'addSongToPlaylist',
  'removeSongFromPlaylist',
  'reorderPlaylistSong',
  'bulkDeleteSongs',
  'bulkMoveSongsToFolder',
  'bulkAddTag',
  'bulkRemoveTag',
  'bulkAddToPlaylist',
  'getSetting',
  'setSetting',
  'resetLearningProgress',
  'resetUserData',
] as const satisfies ReadonlyArray<AppBridgeMethod>;

export type RpcBridgeMethod = (typeof RPC_BRIDGE_METHODS)[number];

export const RPC_BRIDGE_METHOD_SET = new Set<string>(RPC_BRIDGE_METHODS);

export const WEB_SPECIAL_BRIDGE_METHODS = [
  'loadMidiFileData',
  'loadCurriculumMidi',
  'importMidiFiles',
  'reattachMidiFile',
  'exportLibrary',
  'importLibrary',
  'onImportProgress',
  'listAudioFiles',
  'getInstrumentSamplePackStatuses',
  'installInstrumentSamplePack',
  'removeInstrumentSamplePack',
  'resolveInstrumentSampleSource',
] as const satisfies ReadonlyArray<keyof AppBridge>;

export type WebSpecialBridgeMethod = (typeof WEB_SPECIAL_BRIDGE_METHODS)[number];

export const WEB_SPECIAL_BRIDGE_METHOD_SET = new Set<string>(WEB_SPECIAL_BRIDGE_METHODS);

export const WEB_STUB_BRIDGE_METHODS = [
  'pickMidiFile',
  'importMidiFolder',
  'saveMidiFile',
  'saveWavFile',
  'pickAudioFile',
  'pickSampleDirectory',
] as const satisfies ReadonlyArray<keyof AppBridge>;

export type WebStubBridgeMethod = (typeof WEB_STUB_BRIDGE_METHODS)[number];

export const WEB_STUB_BRIDGE_METHOD_SET = new Set<string>(WEB_STUB_BRIDGE_METHODS);

export const WEB_BRIDGE_METHOD_CATEGORIES = {
  rpc: RPC_BRIDGE_METHODS,
  special: WEB_SPECIAL_BRIDGE_METHODS,
  stub: WEB_STUB_BRIDGE_METHODS,
} as const;
