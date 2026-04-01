export type Hand = 'left' | 'right';
export type HandFilter = Hand | 'both';
export type TrackAssignment = Hand | 'both' | 'ignore';
export type NoteJudgement = 'pending' | 'perfect' | 'good' | 'ok' | 'miss';
export type SessionMode = 'piano-hero' | 'learning' | 'performance' | 'free-play';

export interface LoopRange {
  startMeasure: number;
  endMeasure: number;
}

export interface SessionConfig {
  mode: SessionMode;
  tempoMultiplier: number;
  handFilter: HandFilter;
  loopRange: LoopRange | null;
  waitForInput: boolean;
  metronomeEnabled: boolean;
}

export interface ParsedTrack {
  id: string;
  name: string;
  sourceTrackIndex: number;
  defaultAssignment: TrackAssignment;
  assignment: TrackAssignment;
}

export interface ParsedNote {
  id: string;
  trackId: string;
  midi: number;
  name: string;
  velocity: number;
  startSec: number;
  durationSec: number;
  hand: Hand;
}

export interface ParsedSong {
  id: string;
  title: string;
  ppq: number;
  bpm: number;
  durationSec: number;
  tracks: ParsedTrack[];
  notes: ParsedNote[];
}

export interface ScheduledNote extends ParsedNote {
  effectiveHand: Hand;
}

export interface VisibleNote {
  id: string;
  midi: number;
  label: string;
  hand: Hand;
  judgement: NoteJudgement;
  xRatio: number;
  widthRatio: number;
  topRatio: number;
  heightRatio: number;
}

export interface ScoreSnapshot {
  totalScore: number;
  combo: number;
  maxCombo: number;
  comboMultiplier: number;
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  totalNotes: number;
  judgedNotes: number;
  measureAccuracy: Array<{ measure: number; accuracy: number }>;
}

export interface GameResult {
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
  measureAccuracy: Array<{ measure: number; accuracy: number }>;
}

export interface PlaybackSnapshot {
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  combo: number;
  hitLineRatio: number;
  visibleNotes: VisibleNote[];
  activeInputNotes: number[];
  upcomingNotes: Array<{ midi: number; hand: Hand }>;
  score: ScoreSnapshot;
}
