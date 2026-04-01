import * as Tone from 'tone';
import { buildScheduledNotes } from '../game/songUtils';
import type { ParsedSong } from '../game/types';

function midiToName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote();
}

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private metronomeSynth: Tone.Synth | null = null;
  private initialized = false;
  private sustainDown = false;
  private heldNotes = new Set<string>();
  private sustainedNotes = new Set<string>();

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await Tone.start();
    Tone.getContext().lookAhead = 0.01;
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.01,
        decay: 0.12,
        sustain: 0.32,
        release: 1.3,
      },
    }).toDestination();
    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.001,
        decay: 0.04,
        sustain: 0,
        release: 0.05,
      },
    }).toDestination();
    this.initialized = true;
  }

  async noteOn(note: number, velocity = 0.8): Promise<void> {
    await this.init();
    const noteName = midiToName(note);
    this.heldNotes.add(noteName);
    this.sustainedNotes.delete(noteName);
    this.synth?.triggerAttack(noteName, Tone.now(), velocity);
  }

  noteOff(note: number): void {
    const noteName = midiToName(note);
    this.heldNotes.delete(noteName);
    if (this.sustainDown) {
      this.sustainedNotes.add(noteName);
      return;
    }

    this.releaseNote(noteName);
  }

  setSustain(isDown: boolean): void {
    this.sustainDown = isDown;
    if (!isDown) {
      for (const noteName of [...this.sustainedNotes]) {
        if (!this.heldNotes.has(noteName)) {
          this.releaseNote(noteName);
        }
      }
      this.sustainedNotes.clear();
    }
  }

  async playSong(song: ParsedSong, startSec: number, tempoMultiplier: number): Promise<void> {
    await this.init();

    this.pauseSong();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = song.bpm * tempoMultiplier;

    const releaseScale = 1 / tempoMultiplier;

    for (const note of buildScheduledNotes(song)) {
      if (note.startSec < startSec) {
        continue;
      }

      const startAt = (note.startSec - startSec) / tempoMultiplier;
      const duration = Math.max(0.05, note.durationSec * releaseScale);
      Tone.Transport.schedule((time) => {
        this.synth?.triggerAttackRelease(midiToName(note.midi), duration, time, note.velocity);
      }, startAt);
    }

    Tone.Transport.start('+0.02');
  }

  pauseSong(): void {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.allNotesOff();
  }

  seek(): void {
    this.pauseSong();
  }

  setTempo(song: ParsedSong, startSec: number, tempoMultiplier: number, shouldResume: boolean): Promise<void> {
    if (!shouldResume) {
      this.seek();
      return Promise.resolve();
    }

    return this.playSong(song, startSec, tempoMultiplier);
  }

  async playMetronomeClick(accent = false): Promise<void> {
    await this.init();
    const note = accent ? 'C6' : 'C5';
    this.metronomeSynth?.triggerAttackRelease(note, 0.05, Tone.now(), accent ? 0.9 : 0.55);
  }

  allNotesOff(): void {
    this.heldNotes.clear();
    this.sustainedNotes.clear();
    this.synth?.releaseAll();
  }

  private releaseNote(noteName: string): void {
    this.sustainedNotes.delete(noteName);
    this.synth?.triggerRelease(noteName, Tone.now());
  }
}
