import type { MidiMessageEvent } from '../midi/types';
import { ScoringEngine } from './ScoringEngine';
import { buildScheduledNotes, getLoopRangeSeconds, getMeasureIndexForTime } from './songUtils';
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

const MIN_MIDI = 21;
const MAX_MIDI = 108;
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1;
const HIT_WINDOW_SEC = 0.1;
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
  private physicalInputNotes = new Set<number>();
  private activeInputNotes = new Set<number>();
  private sessionConfig: SessionConfig;

  constructor(song: ParsedSong, sessionConfig: SessionConfig) {
    this.song = song;
    this.sessionConfig = sessionConfig;
    this.scoringEngine = new ScoringEngine(0);
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
      if (note.startSec < this.currentTimeSec - HIT_WINDOW_SEC) {
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

  ingestMidiEvent(event: MidiMessageEvent): void {
    const eventSongTime = this.getCurrentTimeSec(event.timestamp);

    if (event.type === 'sustain') {
      this.handleSustain(event.sustainValue ?? 0);
      return;
    }

    if (typeof event.note !== 'number') {
      return;
    }

    if (event.type === 'noteon') {
      this.physicalInputNotes.add(event.note);
      this.activeInputNotes.add(event.note);
      this.matchNote(event.note, eventSongTime);
      return;
    }

    this.physicalInputNotes.delete(event.note);
    if (!this.sustainDown) {
      this.activeInputNotes.delete(event.note);
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
      activeInputNotes: [...this.activeInputNotes].sort((left, right) => left - right),
      upcomingNotes: this.buildUpcomingNotes(currentTimeSec),
      score: scoreSnapshot,
    };
  }

  getFinalResult(): GameResult {
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
    this.scheduledNotes = buildScheduledNotes(this.song)
      .filter((note) => note.startSec >= startSec && note.startSec < endSec)
      .map((note) => ({
        ...note,
        judgement: 'pending' as NoteJudgement,
      }));
    this.scoringEngine.reset(this.scheduledNotes.length);
  }

  private handleSustain(value: number): void {
    this.sustainDown = value >= 64;
    if (this.sustainDown) {
      return;
    }

    for (const note of [...this.activeInputNotes]) {
      if (!this.physicalInputNotes.has(note)) {
        this.activeInputNotes.delete(note);
      }
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
        Math.abs(note.startSec - eventSongTime) <= HIT_WINDOW_SEC,
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

      if (note.startSec + HIT_WINDOW_SEC < currentTimeSec) {
        note.judgement = 'miss';
        this.scoringEngine.recordMiss(this.getMeasureIndex(note.startSec));
        continue;
      }

      break;
    }
  }

  private buildVisibleNotes(currentTimeSec: number): VisibleNote[] {
    const beatsVisible = 8;
    const leadTimeSec = Math.max(
      1.5,
      (beatsVisible * 60) / (this.song.bpm * Math.max(this.sessionConfig.tempoMultiplier, 0.01)),
    );
    const minHeightRatio = 0.03;

    return this.scheduledNotes
      .filter((note) => {
        const endSec = note.startSec + note.durationSec;
        return note.startSec <= currentTimeSec + leadTimeSec && endSec >= currentTimeSec - 0.4;
      })
      .map((note) => {
        const keyIndex = note.midi - MIN_MIDI;
        const xRatio = keyIndex / TOTAL_KEYS;
        const widthRatio = 1 / TOTAL_KEYS;
        const bottomRatio =
          HIT_LINE_RATIO - ((note.startSec - currentTimeSec) / leadTimeSec) * HIT_LINE_RATIO;
        const heightRatio = Math.max(minHeightRatio, (note.durationSec / leadTimeSec) * HIT_LINE_RATIO);
        const topRatio = bottomRatio - heightRatio;

        return {
          id: note.id,
          midi: note.midi,
          label: note.name,
          hand: note.effectiveHand,
          judgement: note.judgement,
          xRatio,
          widthRatio,
          topRatio,
          heightRatio,
        };
      })
      .filter((note) => note.topRatio < 1 && note.topRatio + note.heightRatio > 0);
  }

  private buildUpcomingNotes(currentTimeSec: number): Array<{ midi: number; hand: 'left' | 'right' }> {
    const horizon = currentTimeSec + 1.6;
    const upcoming = new Map<number, 'left' | 'right'>();

    for (const note of this.scheduledNotes) {
      if (note.judgement === 'miss') {
        continue;
      }
      if (note.startSec < currentTimeSec - HIT_WINDOW_SEC) {
        continue;
      }
      if (note.startSec > horizon) {
        break;
      }

      upcoming.set(note.midi, note.effectiveHand);
    }

    return [...upcoming.entries()]
      .map(([midi, hand]) => ({ midi, hand }))
      .sort((left, right) => left.midi - right.midi);
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
