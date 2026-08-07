export type Hand = 'left' | 'right';
export type HandFilter = Hand | 'both';
export type TrackAssignment = Hand | 'both' | 'ignore';
export type NoteJudgement = 'pending' | 'perfect' | 'good' | 'ok' | 'miss';
export type SessionMode = 'piano-hero' | 'learning' | 'performance' | 'free-play';
export type ScoredSessionMode = Exclude<SessionMode, 'free-play'>;
export type HandSize = 'small' | 'medium' | 'large';
export type FingeringDisplayMode = 'always' | 'learning-only' | 'never';

export function isScoredSessionMode(mode: SessionMode): mode is ScoredSessionMode {
  return mode !== 'free-play';
}

export interface LoopRange {
  startMeasure: number;
  endMeasure: number;
}

export interface SessionConfig {
  mode: ScoredSessionMode;
  tempoMultiplier: number;
  handFilter: HandFilter;
  loopRange: LoopRange | null;
  waitForInput: boolean;
  metronomeEnabled: boolean;
  handSize: HandSize;
  fingeringDisplayMode: FingeringDisplayMode;
  pitchBendEnabled: boolean;
  latencyCompMs: number;
  hitWindowMs: number;
  beatsVisible: number;
  leadInBeats: number;
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
  ticks?: number;
  durationTicks?: number;
  hand: Hand;
}

export interface MeasureBoundary {
  startTick: number;
  endTick: number;
  startSec: number;
  endSec: number;
}

export interface ParsedSong {
  id: string;
  title: string;
  ppq: number;
  bpm: number;
  durationSec: number;
  tracks: ParsedTrack[];
  notes: ParsedNote[];
  measureBoundaries?: MeasureBoundary[];
}

export interface ScheduledNote extends ParsedNote {
  effectiveHand: Hand;
  finger?: number;
}

export interface VisibleNote {
  id: string;
  scheduledIndex: number;
  midi: number;
  label: string;
  hand: Hand;
  judgement: NoteJudgement;
  finger?: number;
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
  mode: ScoredSessionMode;
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
  upcomingNotes: Array<{ midi: number; hand: Hand; finger?: number }>;
  score: ScoreSnapshot;
}
