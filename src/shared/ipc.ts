import type {
  AddSongPayload,
  GameResultRow,
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

  getSetting: (category: string, key: string) => Promise<string | null>;
  setSetting: (category: string, key: string, value: string) => Promise<void>;

  loadMidiFileData: (filePath: string) => Promise<Uint8Array>;
  saveMidiFile: (suggestedName: string, data: Uint8Array) => Promise<string | null>;
}
