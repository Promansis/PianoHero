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
  trackAssignments: Record<string, TrackAssignment>;
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
