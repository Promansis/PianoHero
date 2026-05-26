import type { InputEvent } from '../input/types';
import type { FingeringRow } from '../../shared/dbTypes';
import { computeFingering } from './fingeringAlgorithm';
import { ScoringEngine } from './ScoringEngine';
import { buildScheduledNotes, getLoopRangeSeconds, getMeasureIndexForTime } from './songUtils';
import { getKeyPosition } from '../piano/pianoLayout';
import { isScoredSessionMode } from './types';
import type {
  GameResult,
  NoteJudgement,
  ParsedSong,
  PlaybackSnapshot,
  ScheduledNote,
  SessionConfig,
  VisibleNote,
} from './types';

interface ScheduledGameNote extends ScheduledNote {
  judgement: NoteJudgement;
}

const HIT_LINE_RATIO = 0.86;
const BLOCKING_NOTE_EPSILON_SEC = 0.005;

export class GameSession {
  private song: ParsedSong;
  private scheduledNotes: ScheduledGameNote[] = [];
  private isPlaying = false;
  private currentTimeSec = 0;
  private playbackAnchorMs = 0;
  private playbackAnchorSec = 0;
  private scoringEngine: ScoringEngine;
  private sustainDown = false;
  private physicalInputNotes = new Map<number, Set<string>>();
  private activeInputNotes = new Map<number, Set<string>>();
  private sessionConfig: SessionConfig;
  private customFingerings: FingeringRow[];

  constructor(song: ParsedSong, sessionConfig: SessionConfig, customFingerings: FingeringRow[] = []) {
    this.song = song;
    this.sessionConfig = sessionConfig;
    this.customFingerings = customFingerings;
    this.scoringEngine = new ScoringEngine(0, sessionConfig.hitWindowMs / 1000);
    this.resetScheduledNotes();
    this.currentTimeSec = this.getLoopStartSec();
    this.playbackAnchorSec = this.currentTimeSec;
  }

  loadSong(song: ParsedSong, nowMs: number, keepTime = false): void {
    const currentTime = keepTime ? this.getCurrentTimeSec(nowMs) : this.getLoopStartSec();
    this.song = song;
    this.currentTimeSec = Math.min(currentTime, this.getLoopEndSec());
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.resetScheduledNotes();
  }

  updateSessionConfig(sessionConfig: SessionConfig, nowMs: number): void {
    const currentTime = this.getCurrentTimeSec(nowMs);
    this.sessionConfig = sessionConfig;
    this.currentTimeSec = Math.max(this.getLoopStartSec(), Math.min(currentTime, this.getLoopEndSec()));
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.resetScheduledNotes();
  }

  setCustomFingerings(customFingerings: FingeringRow[]): void {
    this.customFingerings = customFingerings;
    this.resetScheduledNotes();
  }

  play(nowMs: number): void {
    this.currentTimeSec = this.getCurrentTimeSec(nowMs);
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.isPlaying = true;
  }

  pause(nowMs: number): void {
    this.currentTimeSec = this.getCurrentTimeSec(nowMs);
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.isPlaying = false;
  }

  restart(nowMs: number): void {
    this.isPlaying = false;
    this.currentTimeSec = this.getLoopStartSec();
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.sustainDown = false;
    this.physicalInputNotes.clear();
    this.activeInputNotes.clear();
    this.resetScheduledNotes();
  }

  seek(targetSec: number, nowMs: number): void {
    const clampedTarget = Math.max(this.getLoopStartSec(), Math.min(targetSec, this.getLoopEndSec()));
    this.currentTimeSec = clampedTarget;
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.resetScheduledNotes();
    for (const note of this.scheduledNotes) {
      if (note.startSec < this.currentTimeSec - this.sessionConfig.hitWindowMs / 1000) {
        note.judgement = 'miss';
        this.scoringEngine.recordMiss(this.getMeasureIndex(note.startSec));
      } else {
        break;
      }
    }
  }

  setTempo(tempoMultiplier: number, nowMs: number): void {
    const currentTime = this.getCurrentTimeSec(nowMs);
    this.sessionConfig = {
      ...this.sessionConfig,
      tempoMultiplier,
    };
    this.currentTimeSec = currentTime;
    this.playbackAnchorSec = currentTime;
    this.playbackAnchorMs = nowMs;
  }

  getCurrentTimeSec(nowMs: number): number {
    if (!this.isPlaying) {
      return this.currentTimeSec;
    }

    const elapsedMs = Math.max(0, nowMs - this.playbackAnchorMs);
    let nextTime =
      this.playbackAnchorSec + (elapsedMs / 1000) * Math.max(this.sessionConfig.tempoMultiplier, 0.01);

    const blockingTime = this.getBlockingTimeSec();
    if (blockingTime !== null && nextTime > blockingTime) {
      nextTime = blockingTime;
      this.playbackAnchorSec = blockingTime;
      this.playbackAnchorMs = nowMs;
    }

    const loopEndSec = this.getLoopEndSec();
    if (nextTime >= loopEndSec) {
      if (this.sessionConfig.loopRange) {
        this.restart(nowMs);
        this.play(nowMs);
        return this.currentTimeSec;
      }
      return Math.min(nextTime, this.song.durationSec);
    }

    return Math.min(nextTime, this.song.durationSec);
  }

  ingestMidiEvent(event: InputEvent): void {
    this.ingestInputEvent(event);
  }

  ingestInputEvent(event: InputEvent): void {
    // Shift timestamp back by latency compensation so a user responding to late audio
    // is credited at the note's intended time rather than their (late) reaction time.
    const adjustedTimestamp = event.timestamp - this.sessionConfig.latencyCompMs;
    const eventSongTime = this.getCurrentTimeSec(adjustedTimestamp);

    if (event.type === 'sustain') {
      this.handleSustain(event.sustainValue ?? 0);
      return;
    }

    if (typeof event.note !== 'number') {
      return;
    }

    if (event.type === 'noteon') {
      this.addSourceToMap(this.physicalInputNotes, event.note, event.sourceId);
      this.addSourceToMap(this.activeInputNotes, event.note, event.sourceId);
      this.matchNote(event.note, eventSongTime);
      return;
    }

    this.removeSourceFromMap(this.physicalInputNotes, event.note, event.sourceId);
    if (!this.sustainDown) {
      this.removeSourceFromMap(this.activeInputNotes, event.note, event.sourceId);
    }
  }

  getSnapshot(nowMs: number): PlaybackSnapshot {
    const currentTimeSec = this.getCurrentTimeSec(nowMs);
    if (this.isPlaying && !this.sessionConfig.loopRange && currentTimeSec >= this.song.durationSec) {
      this.isPlaying = false;
      this.currentTimeSec = this.song.durationSec;
      this.playbackAnchorSec = this.song.durationSec;
      this.playbackAnchorMs = nowMs;
    } else {
      this.currentTimeSec = currentTimeSec;
    }

    this.markMissedNotes(currentTimeSec);

    const scoreSnapshot = this.scoringEngine.getSnapshot();
    return {
      isPlaying: this.isPlaying,
      currentTimeSec,
      durationSec: this.sessionConfig.loopRange
        ? this.getLoopEndSec() - this.getLoopStartSec()
        : this.song.durationSec,
      combo: scoreSnapshot.combo,
      hitLineRatio: HIT_LINE_RATIO,
      visibleNotes: this.buildVisibleNotes(currentTimeSec),
      activeInputNotes: [...this.activeInputNotes.keys()].sort((left, right) => left - right),
      upcomingNotes: this.buildUpcomingNotes(currentTimeSec),
      score: scoreSnapshot,
    };
  }

  getFinalResult(): GameResult {
    if (!isScoredSessionMode(this.sessionConfig.mode)) {
      throw new Error('Free Play sessions do not produce scored game results.');
    }

    return this.scoringEngine.getFinalResult(
      this.song.id,
      this.sessionConfig.mode,
      this.sessionConfig.tempoMultiplier,
      this.song.durationSec,
    );
  }

  getSong(): ParsedSong {
    return this.song;
  }

  isTransportPlaying(): boolean {
    return this.isPlaying;
  }

  getTempoMultiplier(): number {
    return this.sessionConfig.tempoMultiplier;
  }

  getSessionConfig(): SessionConfig {
    return this.sessionConfig;
  }

  private resetScheduledNotes(): void {
    const { startSec, endSec } = getLoopRangeSeconds(this.song, this.sessionConfig.loopRange);
    const scheduledNotes = buildScheduledNotes(this.song)
      .filter((note) => note.startSec >= startSec && note.startSec < endSec)
      .map((note) => ({
        ...note,
        judgement: 'pending' as NoteJudgement,
      }));
    const computedFingerings = computeFingering(scheduledNotes, this.sessionConfig.handSize);
    const overrides = new Map(this.customFingerings.map((row) => [row.noteIndex, row]));

    this.scheduledNotes = scheduledNotes.map((note, noteIndex) => {
      const override = overrides.get(noteIndex);
      return {
        ...note,
        finger:
          override && override.hand === note.effectiveHand
            ? override.finger
            : computedFingerings.get(noteIndex),
      };
    });
    this.scoringEngine.reset(this.scheduledNotes.length);
  }

  private handleSustain(value: number): void {
    this.sustainDown = value >= 64;
    if (this.sustainDown) {
      return;
    }

    for (const note of [...this.activeInputNotes.keys()]) {
      if (!this.physicalInputNotes.has(note)) {
        this.activeInputNotes.delete(note);
      }
    }
  }

  private addSourceToMap(map: Map<number, Set<string>>, note: number, sourceId: string): void {
    const next = map.get(note) ?? new Set<string>();
    next.add(sourceId);
    map.set(note, next);
  }

  private removeSourceFromMap(map: Map<number, Set<string>>, note: number, sourceId: string): void {
    const existing = map.get(note);
    if (!existing) {
      return;
    }

    existing.delete(sourceId);
    if (existing.size === 0) {
      map.delete(note);
    }
  }

  private getMeasureIndex(startSec: number): number {
    return getMeasureIndexForTime(this.song, startSec);
  }

  private matchNote(midi: number, eventSongTime: number): void {
    const candidate = this.scheduledNotes.find(
      (note) =>
        note.judgement === 'pending' &&
        note.midi === midi &&
        Math.abs(note.startSec - eventSongTime) <= this.sessionConfig.hitWindowMs / 1000,
    );

    if (!candidate) {
      return;
    }

    const tier = this.scoringEngine.judgeTiming(eventSongTime - candidate.startSec);
    if (tier === 'miss') {
      candidate.judgement = 'miss';
      this.scoringEngine.recordMiss(this.getMeasureIndex(candidate.startSec));
      return;
    }

    candidate.judgement = tier;
    this.scoringEngine.recordHit(tier, this.getMeasureIndex(candidate.startSec));
  }

  private markMissedNotes(currentTimeSec: number): void {
    if (this.sessionConfig.waitForInput) {
      return;
    }

    for (const note of this.scheduledNotes) {
      if (note.judgement !== 'pending') {
        continue;
      }

      if (note.startSec + this.sessionConfig.hitWindowMs / 1000 < currentTimeSec) {
        note.judgement = 'miss';
        this.scoringEngine.recordMiss(this.getMeasureIndex(note.startSec));
        continue;
      }

      break;
    }
  }

  private buildVisibleNotes(currentTimeSec: number): VisibleNote[] {
    const beatsVisible = this.sessionConfig.beatsVisible;
    const leadTimeSec = Math.max(
      1.5,
      (beatsVisible * 60) / (this.song.bpm * Math.max(this.sessionConfig.tempoMultiplier, 0.01)),
    );
    const minHeightRatio = 0.03;

    return this.scheduledNotes
      .flatMap((note, scheduledIndex) => {
        const endSec = note.startSec + note.durationSec;
        if (!(note.startSec <= currentTimeSec + leadTimeSec && endSec >= currentTimeSec - 0.4)) {
          return [];
        }
        const pos = getKeyPosition(note.midi);
        const xRatio = pos.leftPercent / 100;
        const widthRatio = pos.widthPercent / 100;
        const bottomRatio =
          HIT_LINE_RATIO - ((note.startSec - currentTimeSec) / leadTimeSec) * HIT_LINE_RATIO;
        const heightRatio = Math.max(minHeightRatio, (note.durationSec / leadTimeSec) * HIT_LINE_RATIO);
        const topRatio = bottomRatio - heightRatio;

        return [{
          id: note.id,
          scheduledIndex,
          midi: note.midi,
          label: note.name,
          hand: note.effectiveHand,
          judgement: note.judgement,
          finger: this.shouldDisplayFingering() ? note.finger : undefined,
          xRatio,
          widthRatio,
          topRatio,
          heightRatio,
        }];
      })
      .filter((note) => note.topRatio < 1 && note.topRatio + note.heightRatio > 0);
  }

  private buildUpcomingNotes(currentTimeSec: number): Array<{ midi: number; hand: 'left' | 'right'; finger?: number }> {
    const horizon = currentTimeSec + 1.6;
    const upcoming = new Map<number, { hand: 'left' | 'right'; finger?: number }>();

    for (const note of this.scheduledNotes) {
      if (note.judgement === 'miss') {
        continue;
      }
      if (note.startSec < currentTimeSec - this.sessionConfig.hitWindowMs / 1000) {
        continue;
      }
      if (note.startSec > horizon) {
        break;
      }

      upcoming.set(note.midi, {
        hand: note.effectiveHand,
        finger: this.shouldDisplayFingering() ? note.finger : undefined,
      });
    }

    return [...upcoming.entries()]
      .map(([midi, value]) => ({ midi, hand: value.hand, finger: value.finger }))
      .sort((left, right) => left.midi - right.midi);
  }

  private shouldDisplayFingering(): boolean {
    if (this.sessionConfig.fingeringDisplayMode === 'never') {
      return false;
    }

    if (this.sessionConfig.fingeringDisplayMode === 'learning-only') {
      return this.sessionConfig.mode === 'learning';
    }

    return true;
  }

  private getBlockingTimeSec(): number | null {
    if (!this.sessionConfig.waitForInput) {
      return null;
    }

    const firstPending = this.scheduledNotes.find((note) => note.judgement === 'pending');
    if (!firstPending) {
      return null;
    }

    const blockingStart = firstPending.startSec;
    const blockingGroup = this.scheduledNotes.filter(
      (note) =>
        note.judgement === 'pending' &&
        Math.abs(note.startSec - blockingStart) <= BLOCKING_NOTE_EPSILON_SEC,
    );

    return blockingGroup.length > 0 ? blockingStart : null;
  }

  private getLoopStartSec(): number {
    return getLoopRangeSeconds(this.song, this.sessionConfig.loopRange).startSec;
  }

  private getLoopEndSec(): number {
    return getLoopRangeSeconds(this.song, this.sessionConfig.loopRange).endSec;
  }
}
