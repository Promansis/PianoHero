import * as Tone from 'tone';
import { buildScheduledNotes } from '../game/songUtils';
import type { ParsedSong } from '../game/types';

const SAMPLE_MAP = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3',
} as const;

function midiToName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote();
}

export class AudioEngine {
  private sampler: Tone.Sampler | null = null;

  private synth: Tone.PolySynth | null = null;

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
    await this.loadInstrument();
    this.initialized = true;
  }

  async loadInstrument(): Promise<void> {
    try {
      this.sampler = new Tone.Sampler({
        urls: SAMPLE_MAP,
        release: 1.2,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
      }).toDestination();
      await Tone.loaded();
    } catch (error) {
      console.warn('Sampler failed to load, using synth fallback.', error);
      this.sampler?.dispose();
      this.sampler = null;
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 1.4,
        },
      }).toDestination();
    }
  }

  async noteOn(note: number, velocity = 0.8): Promise<void> {
    await this.init();
    const noteName = midiToName(note);
    this.heldNotes.add(noteName);
    this.sustainedNotes.delete(noteName);
    if (this.sampler) {
      this.sampler.triggerAttack(noteName, Tone.now(), velocity);
      return;
    }
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
        const noteName = midiToName(note.midi);
        if (this.sampler) {
          this.sampler.triggerAttackRelease(noteName, duration, time, note.velocity);
        } else {
          this.synth?.triggerAttackRelease(noteName, duration, time, note.velocity);
        }
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

  allNotesOff(): void {
    this.heldNotes.clear();
    this.sustainedNotes.clear();
    this.sampler?.releaseAll();
    this.synth?.releaseAll();
  }

  private releaseNote(noteName: string): void {
    this.sustainedNotes.delete(noteName);
    if (this.sampler) {
      this.sampler.triggerRelease(noteName, Tone.now());
      return;
    }

    this.synth?.triggerRelease(noteName, Tone.now());
  }
}
