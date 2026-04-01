import type {
  AddSongPayload,
  FingeringRow,
  FolderRow,
  GameResultRow,
  LibraryImportResult,
  PlaylistRow,
  SaveGameResultPayload,
  SongRow,
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

export interface AppBridge {
  pickMidiFile: () => Promise<PickedMidiFile | null>;

  getAllSongs: () => Promise<SongRow[]>;
  getSong: (songId: string) => Promise<SongRow | null>;
  addSong: (song: AddSongPayload) => Promise<SongRow>;
  updateSong: (songId: string, updates: Partial<Omit<SongRow, 'id' | 'dateAdded'>>) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  importMidiFiles: () => Promise<ImportedSong[]>;

  saveGameResult: (payload: SaveGameResultPayload) => Promise<void>;
  getGameResults: (songId: string) => Promise<GameResultRow[]>;
  getUserStats: (songId: string) => Promise<UserStatsRow | null>;

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
  exportLibrary: () => Promise<string | null>;
  importLibrary: () => Promise<LibraryImportResult | null>;

  loadMidiFileData: (filePath: string) => Promise<Uint8Array>;
  saveMidiFile: (suggestedName: string, data: Uint8Array) => Promise<string | null>;
}
