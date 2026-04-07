import type { FreePlayVisualNote } from './FreePlayVisualTypes';

export interface RollingNoteEvent {
  id: string;
  midi: number;
  velocity: number;
  createdAt: number;
}

export interface KeyCenter {
  pitchClass: number;
  keyName: string;
  mode: 'major' | 'minor';
  hue: number;
}

export interface RepeatedNoteStat {
  hits: number;
  streak: number;
  lastHitAt: number;
  peakVelocity: number;
}

export interface HeatPeakZone {
  startMidi: number;
  endMidi: number;
  score: number;
}

export interface ConstellationMotif {
  id: string;
  name: string;
  anchors: Array<{ x: number; y: number }>;
}

export type NoteRegister = 'low' | 'mid' | 'high';

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export const CONSTELLATION_MOTIFS: ConstellationMotif[] = [
  {
    id: 'arch',
    name: 'Arch',
    anchors: [
      { x: 0.08, y: 0.74 },
      { x: 0.22, y: 0.58 },
      { x: 0.36, y: 0.46 },
      { x: 0.52, y: 0.42 },
      { x: 0.68, y: 0.5 },
      { x: 0.82, y: 0.68 },
    ],
  },
  {
    id: 'crown',
    name: 'Crown',
    anchors: [
      { x: 0.12, y: 0.62 },
      { x: 0.28, y: 0.4 },
      { x: 0.44, y: 0.68 },
      { x: 0.58, y: 0.36 },
      { x: 0.74, y: 0.58 },
      { x: 0.88, y: 0.44 },
    ],
  },
  {
    id: 'lyre',
    name: 'Lyre',
    anchors: [
      { x: 0.18, y: 0.28 },
      { x: 0.26, y: 0.6 },
      { x: 0.4, y: 0.78 },
      { x: 0.56, y: 0.56 },
      { x: 0.72, y: 0.26 },
      { x: 0.84, y: 0.46 },
    ],
  },
  {
    id: 'spire',
    name: 'Spire',
    anchors: [
      { x: 0.1, y: 0.7 },
      { x: 0.28, y: 0.64 },
      { x: 0.42, y: 0.5 },
      { x: 0.54, y: 0.22 },
      { x: 0.68, y: 0.54 },
      { x: 0.86, y: 0.74 },
    ],
  },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function midiToLaneRatio(midi: number): number {
  return clamp((midi - 21) / 87, 0.04, 0.96);
}

export function adaptiveLaneRatio(midi: number, adaptiveMin: number, adaptiveMax: number): number {
  const span = Math.max(adaptiveMax - adaptiveMin, 12);
  return clamp((midi - adaptiveMin) / span, 0, 1) * 0.92 + 0.04;
}

export function midiToHue(midi: number): number {
  return (midi * 17 + 40) % 360;
}

export function midiToWatercolorHue(midi: number): number {
  const lane = clamp((midi - 21) / 87, 0, 1);
  return lerp(14, 220, lane);
}

export function midiToLabel(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

export function classifyNoteRegister(midi: number): NoteRegister {
  if (midi < 48) {
    return 'low';
  }
  if (midi < 72) {
    return 'mid';
  }
  return 'high';
}

export function pitchClassLabel(pitchClass: number): string {
  return NOTE_NAMES[((pitchClass % 12) + 12) % 12];
}

export function formatRecordingTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function eventWeight(event: RollingNoteEvent, now: number, windowMs: number): number {
  const age = now - event.createdAt;
  if (age < 0 || age > windowMs) {
    return 0;
  }
  const freshness = 1 - age / windowMs;
  return Math.max(0.08, freshness) * clamp(event.velocity, 0.12, 1.25);
}

export function toRollingEvents(notes: FreePlayVisualNote[]): RollingNoteEvent[] {
  return notes.map((note) => ({
    id: note.id,
    midi: note.midi,
    velocity: note.velocity,
    createdAt: note.createdAt,
  }));
}

export function calculateVisualIntensity(
  noteHistory: RollingNoteEvent[],
  activeNotes: number[],
  now: number,
): number {
  const recentWindowMs = 1800;
  const weightedBursts = noteHistory.reduce((sum, event) => sum + eventWeight(event, now, recentWindowMs), 0);
  const velocityLift =
    noteHistory.length === 0
      ? 0
      : noteHistory
          .filter((event) => now - event.createdAt <= recentWindowMs)
          .reduce((sum, event) => sum + event.velocity, 0) / Math.max(1, noteHistory.filter((event) => now - event.createdAt <= recentWindowMs).length);
  const polyphonyLift = clamp(activeNotes.length / 6, 0, 1);
  return clamp(weightedBursts / 7 + velocityLift * 0.28 + polyphonyLift * 0.35, 0, 1);
}

export function calculateHarmonyEnergy(
  activeNotes: number[],
  noteHistory: RollingNoteEvent[],
  now: number,
): number {
  const recent = noteHistory.filter((event) => now - event.createdAt <= 900);
  const recentVelocity =
    recent.length === 0 ? 0 : recent.reduce((sum, event) => sum + event.velocity, 0) / recent.length;
  const activeSpread =
    activeNotes.length < 2
      ? 0
      : clamp((Math.max(...activeNotes) - Math.min(...activeNotes)) / 36, 0, 1);
  const polyphony = clamp((activeNotes.length - 1) / 4, 0, 1);
  return clamp(polyphony * 0.55 + activeSpread * 0.25 + recentVelocity * 0.3, 0, 1);
}

export function calculatePitchCenter(
  activeNotes: number[],
  noteHistory: RollingNoteEvent[],
  now: number,
): number {
  if (activeNotes.length > 0) {
    return activeNotes.reduce((sum, midi) => sum + midi, 0) / activeNotes.length;
  }

  const recent = noteHistory.filter((event) => now - event.createdAt <= 2200);
  if (recent.length === 0) {
    return 60;
  }

  const weighted = recent.reduce(
    (sum, event) => {
      const weight = eventWeight(event, now, 2200);
      return {
        midi: sum.midi + event.midi * weight,
        weight: sum.weight + weight,
      };
    },
    { midi: 0, weight: 0 },
  );

  return weighted.weight > 0 ? weighted.midi / weighted.weight : 60;
}

export function calculateSilenceProgress(
  activeNotes: number[],
  noteHistory: RollingNoteEvent[],
  now: number,
  silenceWindowMs = 3600,
): number {
  if (activeNotes.length > 0) {
    return 0;
  }

  const latest = noteHistory.reduce((max, event) => Math.max(max, event.createdAt), 0);
  if (latest === 0) {
    return 1;
  }

  return clamp((now - latest) / silenceWindowMs, 0, 1);
}

export function buildPitchClassHistogram(noteHistory: RollingNoteEvent[], now: number, windowMs = 14000): number[] {
  const histogram = Array.from({ length: 12 }, () => 0);
  for (const event of noteHistory) {
    const weight = eventWeight(event, now, windowMs);
    if (weight <= 0) {
      continue;
    }
    histogram[((event.midi % 12) + 12) % 12] += weight;
  }
  return histogram;
}

function rotateProfile(profile: number[], offset: number): number[] {
  return profile.map((_value, index) => profile[(index - offset + 12) % 12]);
}

function correlate(histogram: number[], profile: number[]): number {
  return histogram.reduce((sum, value, index) => sum + value * profile[index], 0);
}

export function detectKeyCenter(noteHistory: RollingNoteEvent[], now: number): KeyCenter {
  const histogram = buildPitchClassHistogram(noteHistory, now);
  let best: { pitchClass: number; mode: 'major' | 'minor'; score: number } = {
    pitchClass: 0,
    mode: 'major',
    score: Number.NEGATIVE_INFINITY,
  };

  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    const majorScore = correlate(histogram, rotateProfile(MAJOR_PROFILE, pitchClass));
    if (majorScore > best.score) {
      best = { pitchClass, mode: 'major', score: majorScore };
    }
    const minorScore = correlate(histogram, rotateProfile(MINOR_PROFILE, pitchClass));
    if (minorScore > best.score) {
      best = { pitchClass, mode: 'minor', score: minorScore };
    }
  }

  const rootLabel = pitchClassLabel(best.pitchClass);
  return {
    pitchClass: best.pitchClass,
    keyName: `${rootLabel} ${best.mode === 'major' ? 'Major' : 'Minor'}`,
    mode: best.mode,
    hue: midiToHue(60 + best.pitchClass),
  };
}

export function updateRepeatedNoteStats(
  stats: Map<number, RepeatedNoteStat>,
  note: RollingNoteEvent,
): Map<number, RepeatedNoteStat> {
  const next = new Map(stats);
  const current = next.get(note.midi);
  const withinStreak = current && note.createdAt - current.lastHitAt <= 1800;
  next.set(note.midi, {
    hits: (current?.hits ?? 0) + 1,
    streak: withinStreak ? current!.streak + 1 : 1,
    lastHitAt: note.createdAt,
    peakVelocity: Math.max(current?.peakVelocity ?? 0, note.velocity),
  });
  return next;
}

export function coolHeatValues(values: number[], deltaMs: number, decayPerSecond = 0.42): number[] {
  if (deltaMs <= 0) {
    return values.slice();
  }
  const decayFactor = Math.exp(-decayPerSecond * (deltaMs / 1000));
  return values.map((value) => value * decayFactor);
}

export function applyNoteToHeatmap(values: number[], midi: number, velocity: number): number[] {
  const next = values.slice();
  const index = clamp(midi - 21, 0, 87);
  next[index] = clamp(next[index] + velocity * 0.72 + 0.18, 0, 1.6);
  return next;
}

export function buildHeatHistoryRow(values: number[]): number[] {
  return values.map((value) => clamp(value, 0, 1));
}

export function findPeakHeatZones(values: number[], count = 3): HeatPeakZone[] {
  const zones: HeatPeakZone[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const left = values[Math.max(0, index - 1)] ?? 0;
    const center = values[index] ?? 0;
    const right = values[Math.min(values.length - 1, index + 1)] ?? 0;
    const score = left * 0.4 + center + right * 0.4;
    zones.push({
      startMidi: index + 21,
      endMidi: index + 21,
      score,
    });
  }

  return zones
    .sort((left, right) => right.score - left.score)
    .slice(0, count)
    .map((zone) => ({
      startMidi: zone.startMidi,
      endMidi: zone.endMidi,
      score: zone.score,
    }));
}

export function selectConstellationMotif(noteHistory: RollingNoteEvent[]): ConstellationMotif {
  const recent = noteHistory.slice(-8);
  if (recent.length === 0) {
    return CONSTELLATION_MOTIFS[0];
  }

  const signature = recent.reduce((sum, event, index) => {
    return sum + (((event.midi % 12) + 12) % 12) * (index + 3);
  }, 0);
  return CONSTELLATION_MOTIFS[signature % CONSTELLATION_MOTIFS.length];
}
