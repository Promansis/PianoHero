import type { Hand, HandFilter } from '../game/types';

export type LearningTierId = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TierCapstone {
  songFileName: string;
  displayTitle: string;
  accuracyThreshold: number;
  tempoPercent: number;
  handFilter: 'right' | 'left' | 'both';
  description: string;
}

export interface LearningTier {
  id: LearningTierId;
  order: number;
  title: string;
  summary: string;
  lessons: Lesson[];
  capstone?: TierCapstone;
}

export interface Lesson {
  id: string;
  tier: LearningTierId;
  order: number;
  title: string;
  summary: string;
  estMinutes: number;
  steps: LessonStep[];
  isStub?: boolean;
}

export type LessonStep =
  | TipStep
  | DrillStep
  | ScaleStep
  | IntervalStep
  | QuizStep
  | NotationReadingStep
  | EarTrainingStep
  | RhythmClappingStep;

export interface TipStep {
  kind: 'tip';
  title: string;
  body: string;
  diagram?: DiagramSpec;
}

export interface DrillStep {
  kind: 'drill';
  title: string;
  body?: string;
  drill: DrillSpec;
  tempoMultiplier?: number;
  handFilter?: HandFilter;
  passAccuracy?: number;
}

export interface ScaleStep {
  kind: 'scale';
  title: string;
  body?: string;
  root: number;
  scaleName: string;
  passAccuracy?: number;
}

export interface IntervalStep {
  kind: 'interval';
  title: string;
  body?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  passAccuracy?: number;
}

export interface QuizStep {
  kind: 'quiz';
  title: string;
  body?: string;
  quizType: 'chord' | 'scale' | 'interval' | 'mixed';
  passAccuracy?: number;
}

export interface NotationReadingPrompt {
  midi: number;
  clef: 'treble' | 'bass';
}

export interface NotationReadingStep {
  kind: 'notation-reading';
  title: string;
  body?: string;
  prompts: NotationReadingPrompt[];
  passAccuracy?: number;
}

export interface EarTrainingPrompt {
  kind: 'interval' | 'chord-quality';
  rootMidi: number;
  answer: string;
  choices: string[];
}

export interface EarTrainingStep {
  kind: 'ear-training';
  title: string;
  body?: string;
  prompts: EarTrainingPrompt[];
  passAccuracy?: number;
}

export interface RhythmClappingStep {
  kind: 'rhythm-clapping';
  title: string;
  body?: string;
  bpm: number;
  patternBeats: number[];
  measures?: number;
  toleranceMs?: number;
  passAccuracy?: number;
}

export type DiagramSpec =
  | { kind: 'keyboard-highlight'; midiNotes: number[]; labels?: Record<number, string> }
  | { kind: 'finger-numbers'; hand: Hand }
  | { kind: 'setup-diagram'; variant: 'seat-height' | 'distance' | 'posture' | 'hand-shape' }
  | { kind: 'image'; src: string; alt: string };

export type DrillSpec =
  | {
      kind: 'single-note-rhythm';
      bpm: number;
      midi: number;
      hand: Hand;
      patternBeats: number[];
      repetitions?: number;
    }
  | {
      kind: 'five-finger-pattern';
      bpm: number;
      startMidi: number;
      handMode: 'right' | 'left' | 'parallel' | 'contrary';
      direction: 'ascending' | 'descending' | 'up-down';
      repetitions?: number;
      noteBeats?: number;
    }
  | {
      kind: 'melody';
      bpm: number;
      notes: Array<{ midi: number; beats: number; hand: Hand }>;
    }
  | {
      kind: 'interval-jumps';
      bpm: number;
      baseMidi: number;
      intervals: number[];
      handMode: 'right' | 'left' | 'alternating';
      noteBeats?: number;
    }
  | {
      kind: 'motion-pattern';
      bpm: number;
      startMidi: number;
      intervals: number[];
      handMode: 'parallel' | 'contrary';
      repetitions?: number;
      noteBeats?: number;
    }
  | {
      kind: 'arpeggio';
      bpm: number;
      rootMidi: number;
      quality: 'major' | 'minor' | 'dominant7';
      hands: 'right' | 'left' | 'parallel';
      octaves: number;
      direction: 'ascending' | 'descending' | 'up-down';
      noteBeats?: number;
    };

export interface LearningProgress {
  completedLessons: string[];
  completedSteps: Record<string, number[]>;
  gatingEnabled: boolean;
  capstoneResults: Record<string, number>;
}
