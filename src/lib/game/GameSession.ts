import type { MidiMessageEvent } from '../midi/types';
import { buildScheduledNotes } from './songUtils';
import type { NoteJudgement, ParsedSong, PlaybackSnapshot, ScheduledNote, VisibleNote } from './types';

interface ScheduledGameNote extends ScheduledNote {
  judgement: NoteJudgement;
}

const MIN_MIDI = 21;
const MAX_MIDI = 108;
const TOTAL_KEYS = MAX_MIDI - MIN_MIDI + 1;
const HIT_WINDOW_SEC = 0.1;
const HIT_LINE_RATIO = 0.86;

export class GameSession {
  private song: ParsedSong;

  private scheduledNotes: ScheduledGameNote[] = [];

  private isPlaying = false;

  private currentTimeSec = 0;

  private tempoMultiplier = 1;

  private playbackAnchorMs = 0;

  private playbackAnchorSec = 0;

  private combo = 0;

  private sustainDown = false;

  private physicalInputNotes = new Set<number>();

  private activeInputNotes = new Set<number>();

  constructor(song: ParsedSong, tempoMultiplier = 1) {
    this.song = song;
    this.tempoMultiplier = tempoMultiplier;
    this.resetScheduledNotes();
  }

  loadSong(song: ParsedSong, nowMs: number, keepTime = false): void {
    const currentTime = keepTime ? this.getCurrentTimeSec(nowMs) : 0;
    this.song = song;
    this.currentTimeSec = Math.min(currentTime, song.durationSec);
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.combo = 0;
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
    this.currentTimeSec = 0;
    this.playbackAnchorSec = 0;
    this.playbackAnchorMs = nowMs;
    this.combo = 0;
    this.sustainDown = false;
    this.physicalInputNotes.clear();
    this.activeInputNotes.clear();
    this.resetScheduledNotes();
  }

  seek(targetSec: number, nowMs: number): void {
    this.currentTimeSec = Math.max(0, Math.min(targetSec, this.song.durationSec));
    this.playbackAnchorSec = this.currentTimeSec;
    this.playbackAnchorMs = nowMs;
    this.combo = 0;
    this.resetScheduledNotes();
  }

  setTempo(tempoMultiplier: number, nowMs: number): void {
    const currentTime = this.getCurrentTimeSec(nowMs);
    this.tempoMultiplier = tempoMultiplier;
    this.currentTimeSec = currentTime;
    this.playbackAnchorSec = currentTime;
    this.playbackAnchorMs = nowMs;
  }

  getCurrentTimeSec(nowMs: number): number {
    if (!this.isPlaying) {
      return this.currentTimeSec;
    }

    const elapsedMs = Math.max(0, nowMs - this.playbackAnchorMs);
    const nextTime = this.playbackAnchorSec + elapsedMs / 1000 * this.tempoMultiplier;
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
    if (this.isPlaying && currentTimeSec >= this.song.durationSec) {
      this.isPlaying = false;
      this.currentTimeSec = this.song.durationSec;
      this.playbackAnchorSec = this.song.durationSec;
      this.playbackAnchorMs = nowMs;
    }

    this.markMissedNotes(currentTimeSec);

    return {
      isPlaying: this.isPlaying,
      currentTimeSec,
      durationSec: this.song.durationSec,
      combo: this.combo,
      hitLineRatio: HIT_LINE_RATIO,
      visibleNotes: this.buildVisibleNotes(currentTimeSec),
      activeInputNotes: [...this.activeInputNotes].sort((left, right) => left - right),
      upcomingNotes: this.buildUpcomingNotes(currentTimeSec),
    };
  }

  getSong(): ParsedSong {
    return this.song;
  }

  isTransportPlaying(): boolean {
    return this.isPlaying;
  }

  getTempoMultiplier(): number {
    return this.tempoMultiplier;
  }

  private resetScheduledNotes(): void {
    this.scheduledNotes = buildScheduledNotes(this.song).map((note) => ({
      ...note,
      judgement: 'pending',
    }));
  }

  private handleSustain(value: number): void {
    const isDown = value >= 64;
    this.sustainDown = isDown;
    if (!isDown) {
      for (const note of [...this.activeInputNotes]) {
        if (!this.physicalInputNotes.has(note)) {
          this.activeInputNotes.delete(note);
        }
      }
    }
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

    candidate.judgement = 'hit';
    this.combo += 1;
  }

  private markMissedNotes(currentTimeSec: number): void {
    for (const note of this.scheduledNotes) {
      if (note.judgement !== 'pending') {
        continue;
      }

      if (note.startSec + HIT_WINDOW_SEC < currentTimeSec) {
        note.judgement = 'miss';
        this.combo = 0;
      } else {
        break;
      }
    }
  }

  private buildVisibleNotes(currentTimeSec: number): VisibleNote[] {
    const beatsVisible = 8;
    const leadTimeSec = Math.max(1.5, beatsVisible * 60 / (this.song.bpm * this.tempoMultiplier));
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
        const bottomRatio = HIT_LINE_RATIO - (note.startSec - currentTimeSec) / leadTimeSec * HIT_LINE_RATIO;
        const heightRatio = Math.max(minHeightRatio, note.durationSec / leadTimeSec * HIT_LINE_RATIO);
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
}
