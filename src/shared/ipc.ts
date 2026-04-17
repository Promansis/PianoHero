import type {
  AddSongPayload,
  AchievementRow,
  FingeringRow,
  FolderRow,
  GameResultRow,
  GlobalTroubleSpot,
  LibraryImportResult,
  MeasureAccuracyHistoryRow,
  PlaylistRow,
  PracticeDayRow,
  PracticeStreak,
  ProgressStatsResult,
  RecommendationResult,
  SaveResultOutcome,
  SaveGameResultPayload,
  SaveTheoryResultPayload,
  SongRow,
  TheoryResultRow,
  TheoryStatsRow,
  TopSongStat,
  TroubleSpotRow,
  UserStatsRow,
} from './dbTypes';

export interface PickedMidiFile {
  name: string;
  path?: string;
  data: Uint8Array;
}

export interface ImportedSong {
  songId: string;
  destPath: string;
  fileData: Uint8Array;
  title: string;
  durationSec: number;
  bpm: number;
  noteCount: number;
  difficulty: number;
}

export interface ImportError {
  filename: string;
  message: string;
}

export interface ImportResult {
  songs: ImportedSong[];
  errors: ImportError[];
}

export interface ImportProgressEvent {
  current: number;
  total: number;
  filename: string;
}

export interface AppBridge {
  pickMidiFile: () => Promise<PickedMidiFile | null>;

  getAllSongs: () => Promise<SongRow[]>;
  getSong: (songId: string) => Promise<SongRow | null>;
  addSong: (song: AddSongPayload) => Promise<SongRow>;
  updateSong: (songId: string, updates: Partial<Omit<SongRow, 'id' | 'dateAdded'>>) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  importMidiFiles: () => Promise<ImportResult>;
  importMidiFolder: () => Promise<{ imported: ImportedSong[]; skipped: number; errors: ImportError[] } | null>;
  onImportProgress: (cb: (ev: ImportProgressEvent) => void) => () => void;

  saveGameResult: (payload: SaveGameResultPayload) => Promise<SaveResultOutcome>;
  getGameResults: (songId: string) => Promise<GameResultRow[]>;
  getUserStats: (songId: string) => Promise<UserStatsRow | null>;
  saveTheoryResult: (payload: SaveTheoryResultPayload) => Promise<SaveResultOutcome>;
  getTheoryResults: (type?: TheoryResultRow['type'], limit?: number) => Promise<TheoryResultRow[]>;
  getTheoryStats: (type: TheoryResultRow['type']) => Promise<TheoryStatsRow>;

  getPracticeDays: (fromDate: string, toDate: string) => Promise<PracticeDayRow[]>;
  recordPracticeTime: (durationSec: number, songsPlayed: number, theorySessions: number) => Promise<void>;
  getPracticeStreak: () => Promise<PracticeStreak>;

  getAllAchievements: () => Promise<AchievementRow[]>;
  unlockAchievement: (achievementId: string) => Promise<void>;

  getTroubleSpots: (songId: string) => Promise<TroubleSpotRow[]>;
  updateTroubleSpot: (
    spotId: string,
    updates: Partial<Omit<TroubleSpotRow, 'id' | 'songId'>>,
  ) => Promise<void>;
  getMeasureAccuracyHistory: (songId: string) => Promise<MeasureAccuracyHistoryRow[]>;

  getRecommendations: () => Promise<RecommendationResult>;
  getProgressStats: (fromDate: string, toDate: string) => Promise<ProgressStatsResult>;
  getProgressTopSongs: () => Promise<TopSongStat[]>;
  getAllUnresolvedTroubleSpots: () => Promise<GlobalTroubleSpot[]>;

  getCustomFingerings: (songId: string) => Promise<FingeringRow[]>;
  saveCustomFingering: (
    songId: string,
    noteIndex: number,
    finger: number,
    hand: FingeringRow['hand'],
  ) => Promise<void>;
  clearCustomFingerings: (songId: string) => Promise<void>;

  getAllFolders: () => Promise<FolderRow[]>;
  createFolder: (name: string) => Promise<FolderRow>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveSongToFolder: (songId: string, folderId: string | null) => Promise<void>;

  getAllPlaylists: () => Promise<PlaylistRow[]>;
  createPlaylist: (name: string) => Promise<PlaylistRow>;
  updatePlaylist: (
    playlistId: string,
    updates: Partial<Pick<PlaylistRow, 'name' | 'description'>>,
  ) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  getPlaylistSongs: (playlistId: string) => Promise<SongRow[]>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylistSong: (playlistId: string, songId: string, newOrder: number) => Promise<void>;

  bulkDeleteSongs: (songIds: string[]) => Promise<void>;
  bulkMoveSongsToFolder: (songIds: string[], folderId: string | null) => Promise<void>;
  bulkAddTag: (songIds: string[], tag: string) => Promise<void>;
  bulkRemoveTag: (songIds: string[], tag: string) => Promise<void>;
  bulkAddToPlaylist: (songIds: string[], playlistId: string) => Promise<void>;

  getSetting: (category: string, key: string) => Promise<string | null>;
  setSetting: (category: string, key: string, value: string) => Promise<void>;
  resetLearningProgress: () => Promise<void>;
  resetUserData: () => Promise<void>;
  exportLibrary: () => Promise<string | null>;
  importLibrary: () => Promise<LibraryImportResult | null>;

  loadMidiFileData: (songId: string) => Promise<Uint8Array>;
  loadCurriculumMidi: (filename: string) => Promise<Uint8Array>;
  saveMidiFile: (suggestedName: string, data: Uint8Array) => Promise<string | null>;
  saveWavFile: (suggestedName: string, data: Uint8Array) => Promise<string | null>;
  pickAudioFile: () => Promise<{ path: string; name: string } | null>;
  pickSampleDirectory: () => Promise<string | null>;
  listAudioFiles: (dir: string) => Promise<string[]>;
}
