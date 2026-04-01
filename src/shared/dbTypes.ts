import type { SessionMode, TrackAssignment } from '../lib/game/types';

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  genre: string;
  filePath: string;
  difficulty: number;
  durationSec: number;
  bpm: number;
  noteCount: number;
  dateAdded: string;
  timesPlayed: number;
  tags: string[];
  isFavorite: boolean;
  folderId: string | null;
  trackAssignments: Record<string, TrackAssignment>;
}

export interface FolderRow {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface PlaylistRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  songCount?: number;
}

export interface FingeringRow {
  songId: string;
  noteIndex: number;
  finger: number;
  hand: 'left' | 'right';
}

export interface SettingRow {
  category: string;
  key: string;
  value: string;
}

export interface LibraryBackup {
  version: 1;
  exportedAt: string;
  songs: SongRow[];
  folders: FolderRow[];
  playlists: Array<PlaylistRow & { songIds: string[] }>;
  fingerings: FingeringRow[];
  settings: SettingRow[];
}

export interface LibraryImportResult {
  songsImported: number;
  foldersImported: number;
  playlistsImported: number;
}

export interface UserStatsRow {
  songId: string;
  playCount: number;
  bestScore: number;
  averageScore: number;
  bestAccuracy: number;
  lastPlayed: string | null;
  totalPracticeTimeSec: number;
}

export interface GameResultRow {
  id: string;
  songId: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectHits: number;
  goodHits: number;
  okHits: number;
  misses: number;
  timestamp: string;
  tempo: number;
  mode: SessionMode;
  durationSec: number;
}

export interface AddSongPayload {
  id: string;
  title: string;
  artist: string;
  genre: string;
  filePath: string;
  difficulty: number;
  durationSec: number;
  bpm: number;
  noteCount: number;
  tags: string[];
  folderId?: string | null;
  trackAssignments: Record<string, TrackAssignment>;
}

export interface SaveGameResultPayload {
  songId: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectHits: number;
  goodHits: number;
  okHits: number;
  misses: number;
  tempo: number;
  mode: SessionMode;
  durationSec: number;
}
