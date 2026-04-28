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

export interface LibraryBackupMidiFile {
  songId: string;
  filename: string;
  dataBase64: string;
  byteLength: number;
}

export interface LibraryBackupV1 {
  version: 1;
  exportedAt: string;
  songs: SongRow[];
  folders: FolderRow[];
  playlists: Array<PlaylistRow & { songIds: string[] }>;
  fingerings: FingeringRow[];
  settings: SettingRow[];
}

export interface LibraryBackupV2 extends Omit<LibraryBackupV1, 'version'> {
  version: 2;
  midiFiles: LibraryBackupMidiFile[];
}

export type LibraryBackup = LibraryBackupV1 | LibraryBackupV2;

export interface LibraryImportResult {
  songsImported: number;
  foldersImported: number;
  playlistsImported: number;
  midiFilesRestored: number;
  missingMidiFiles: string[];
}

export interface LibraryExportResult {
  filename: string;
  target: 'file' | 'download';
  location?: string;
  songsExported: number;
  midiFilesIncluded: number;
  missingMidiFiles: string[];
}

export interface LibrarySnapshot {
  songs: SongRow[];
  folders: FolderRow[];
  playlists: PlaylistRow[];
  recommendations: RecommendationResult | null;
  statsBySongId: Record<string, UserStatsRow | null>;
  songGoals: Record<string, number>;
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

export interface MeasureAccuracyEntry {
  measure: number;
  accuracy: number;
}

export type TheoryResultType = 'quiz' | 'interval-trainer' | 'scale-practice';

export interface TheoryResultRow {
  id: string;
  type: TheoryResultType;
  score: number;
  totalQuestions: number;
  accuracy: number;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface TheoryStatsRow {
  type: TheoryResultType;
  sessionCount: number;
  bestScore: number;
  averageAccuracy: number;
  lastPlayed: string | null;
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
  measureAccuracy: MeasureAccuracyEntry[];
}

export interface SaveTheoryResultPayload {
  type: TheoryResultType;
  score: number;
  totalQuestions: number;
  accuracy: number;
  details?: Record<string, unknown>;
}

export interface SaveResultOutcome {
  unlockedAchievementIds: string[];
  dailyGoalReached: boolean;
  songGoalReached: boolean;
}

export interface PracticeDayRow {
  date: string;
  totalPracticeTimeSec: number;
  songsPlayed: number;
  theorySessions: number;
}

export interface PracticeStreak {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
}

export interface AchievementRow {
  id: string;
  unlockedAt: string | null;
}

export interface TroubleSpotRow {
  id: string;
  songId: string;
  measureStart: number;
  measureEnd: number;
  firstDetected: string;
  lastPracticed: string | null;
  resolutionCount: number;
  isResolved: boolean;
  struggleCount: number;
  lowestAccuracy: number | null;
  latestAccuracy: number | null;
}

export interface MeasureAccuracyHistoryRow {
  id: string;
  gameResultId: string;
  measure: number;
  accuracy: number;
}

export interface RecommendationItem {
  song: SongRow;
  reason: string;
}

export interface RecommendationResult {
  nextChallenge: RecommendationItem[];
  skillBuilder: RecommendationItem[];
  youMightLike: RecommendationItem[];
  revisit: RecommendationItem[];
}

export interface ProgressStatsResult {
  practiceTimeByDay: Array<{ date: string; minutes: number }>;
  theorySessionsByDay: Array<{ date: string; sessions: number }>;
  songsPlayedByWeek: Array<{ weekStart: string; count: number }>;
  accuracyTrend: Array<{ date: string; avgAccuracy: number }>;
  hitQuality: { perfect: number; good: number; ok: number; misses: number };
  totalStats: {
    totalSongs: number;
    songsMastered: number;
    totalPracticeTimeSec: number;
    favoriteGenre: string;
  };
}

export interface TopSongStat {
  songId: string;
  title: string;
  playCount: number;
  bestAccuracy: number;
  totalPracticeTimeSec: number;
}

export interface GlobalTroubleSpot {
  id: string;
  songId: string;
  songTitle: string;
  measureStart: number;
  measureEnd: number;
  struggleCount: number;
  lowestAccuracy: number | null;
  latestAccuracy: number | null;
}
