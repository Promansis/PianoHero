export type Hand = 'left' | 'right';
export type TrackAssignment = Hand | 'both' | 'ignore';
export type NoteJudgement = 'pending' | 'hit' | 'miss';

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

export interface PlaybackSnapshot {
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  combo: number;
  hitLineRatio: number;
  visibleNotes: VisibleNote[];
  activeInputNotes: number[];
  upcomingNotes: Array<{ midi: number; hand: Hand }>;
}
