import * as Tone from 'tone';
import { buildScheduledNotes } from '../game/songUtils';
import type { ParsedSong } from '../game/types';
import {
  DEFAULT_INSTRUMENT_ID,
  getInstrumentDefinition,
  type InstrumentDefinition,
  type InstrumentVoice,
} from './instrumentCatalog';

function midiToName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote();
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function percentToDb(value: number): number {
  const gain = clampPercent(value) / 100;
  if (gain <= 0) {
    return -60;
  }

  return Tone.gainToDb(gain);
}

function resolveVoiceConstructor(voice: InstrumentVoice): any {
  switch (voice) {
    case 'am':
      return Tone.AMSynth;
    case 'fm':
      return Tone.FMSynth;
    case 'mono':
      return Tone.MonoSynth;
    case 'sampler':
    case 'synth':
    default:
      return Tone.Synth;
  }
}

function createSamplerFallbackDefinition(definition: InstrumentDefinition): InstrumentDefinition {
  return {
    ...definition,
    voice: 'synth',
    options: {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.01,
        decay: 0.12,
        sustain: 0.32,
        release: 1.3,
      },
    },
  };
}

export class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private synth: Tone.PolySynth | null = null;
  private metronomeSynth: Tone.Synth | null = null;
  private masterVolumeNode: Tone.Volume | null = null;
  private instrumentOutputNode: Tone.Volume | null = null;
  private instrumentReverbNode: Tone.FeedbackDelay | null = null;
  private metronomeVolumeNode: Tone.Volume | null = null;
  private initialized = false;
  private sustainDown = false;
  private heldNotes = new Set<string>();
  private sustainedNotes = new Set<string>();
  private instrumentId = DEFAULT_INSTRUMENT_ID;
  private masterVolumePercent = 80;
  private metronomeVolumePercent = 65;
  private reverbPercent = 20;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await Tone.start();
    Tone.getContext().lookAhead = 0.01;
    this.masterVolumeNode = new Tone.Volume(percentToDb(this.masterVolumePercent)).toDestination();
    this.instrumentOutputNode = new Tone.Volume(0).connect(this.masterVolumeNode);
    this.instrumentReverbNode = new Tone.FeedbackDelay({
      delayTime: 0.18,
      feedback: 0.22,
      wet: this.reverbPercent / 100,
    }).connect(this.masterVolumeNode);
    this.metronomeVolumeNode = new Tone.Volume(percentToDb(this.metronomeVolumePercent)).connect(this.masterVolumeNode);
    await this.loadInstrument(getInstrumentDefinition(this.instrumentId));
    this.metronomeSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.001,
        decay: 0.04,
        sustain: 0,
        release: 0.05,
      },
    }).connect(this.metronomeVolumeNode);
    this.initialized = true;
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

  async playSong(
    song: ParsedSong,
    startSec: number,
    tempoMultiplier: number,
    loopEndSec?: number,
  ): Promise<void> {
    await this.init();

    this.pauseSong();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    Tone.Transport.loop = false;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = 0;
    Tone.Transport.bpm.value = song.bpm * tempoMultiplier;

    const clampedLoopEndSec =
      typeof loopEndSec === 'number' ? Math.max(startSec, Math.min(loopEndSec, song.durationSec)) : undefined;
    const releaseScale = 1 / tempoMultiplier;

    for (const note of buildScheduledNotes(song)) {
      if (note.startSec < startSec) {
        continue;
      }
      if (typeof clampedLoopEndSec === 'number' && note.startSec >= clampedLoopEndSec) {
        break;
      }

      const startAt = (note.startSec - startSec) / tempoMultiplier;
      const unclampedDurationSec =
        typeof clampedLoopEndSec === 'number'
          ? Math.min(note.durationSec, Math.max(0, clampedLoopEndSec - note.startSec))
          : note.durationSec;
      const duration = Math.max(0.05, unclampedDurationSec * releaseScale);
      Tone.Transport.schedule((time) => {
        const noteName = midiToName(note.midi);
        if (this.sampler) {
          this.sampler.triggerAttackRelease(noteName, duration, time, note.velocity);
          return;
        }
        this.synth?.triggerAttackRelease(noteName, duration, time, note.velocity);
      }, startAt);
    }

    if (typeof clampedLoopEndSec === 'number' && clampedLoopEndSec > startSec) {
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = (clampedLoopEndSec - startSec) / Math.max(tempoMultiplier, 0.01);
      Tone.Transport.loop = true;
    }

    Tone.Transport.start('+0.02');
  }

  pauseSong(): void {
    Tone.Transport.stop();
    Tone.Transport.loop = false;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = 0;
    Tone.Transport.cancel(0);
    this.allNotesOff();
  }

  seek(): void {
    this.pauseSong();
  }

  setTempo(
    song: ParsedSong,
    startSec: number,
    tempoMultiplier: number,
    shouldResume: boolean,
    loopEndSec?: number,
  ): Promise<void> {
    if (!shouldResume) {
      this.seek();
      return Promise.resolve();
    }

    return this.playSong(song, startSec, tempoMultiplier, loopEndSec);
  }

  async playMetronomeClick(accent = false): Promise<void> {
    await this.init();
    const note = accent ? 'C6' : 'C5';
    this.metronomeSynth?.triggerAttackRelease(note, 0.05, Tone.now(), accent ? 0.9 : 0.55);
  }

  allNotesOff(): void {
    this.heldNotes.clear();
    this.sustainedNotes.clear();
    this.sampler?.releaseAll();
    this.synth?.releaseAll();
  }

  async setInstrument(instrumentId: string): Promise<void> {
    const definition = getInstrumentDefinition(instrumentId);
    this.instrumentId = definition.id;
    if (!this.initialized) {
      return;
    }

    await this.rebuildInstrument(definition);
  }

  setMasterVolume(value: number): void {
    this.masterVolumePercent = clampPercent(value);
    if (this.masterVolumeNode) {
      this.masterVolumeNode.volume.value = percentToDb(this.masterVolumePercent);
    }
  }

  setMetronomeVolume(value: number): void {
    this.metronomeVolumePercent = clampPercent(value);
    if (this.metronomeVolumeNode) {
      this.metronomeVolumeNode.volume.value = percentToDb(this.metronomeVolumePercent);
    }
  }

  setReverbLevel(value: number): void {
    this.reverbPercent = clampPercent(value);
    if (this.instrumentReverbNode) {
      this.instrumentReverbNode.wet.value = this.reverbPercent / 100;
    }
  }

  private releaseNote(noteName: string): void {
    this.sustainedNotes.delete(noteName);
    if (this.sampler) {
      this.sampler.triggerRelease(noteName, Tone.now());
      return;
    }
    this.synth?.triggerRelease(noteName, Tone.now());
  }

  private async rebuildInstrument(definition: InstrumentDefinition): Promise<void> {
    this.allNotesOff();
    this.sampler?.dispose();
    this.sampler = null;
    this.synth?.dispose();
    this.synth = null;
    await this.loadInstrument(definition);
  }

  private async loadInstrument(definition: InstrumentDefinition): Promise<void> {
    if (definition.voice === 'sampler' && definition.sampleUrls && definition.sampleBaseUrl) {
      try {
        const samplerOptions = definition.options as { release?: number };
        this.sampler = new Tone.Sampler({
          urls: definition.sampleUrls,
          baseUrl: definition.sampleBaseUrl,
          release: samplerOptions.release,
        }).connect(this.instrumentOutputNode!);
        if (this.instrumentReverbNode) {
          this.sampler.connect(this.instrumentReverbNode);
        }
        await Tone.loaded();
        return;
      } catch {
        this.sampler?.dispose();
        this.sampler = null;
      }

      this.synth = this.createPolySynth(createSamplerFallbackDefinition(definition));
      return;
    }

    this.synth = this.createPolySynth(definition);
  }

  private createPolySynth(definition: InstrumentDefinition): Tone.PolySynth {
    if (!this.instrumentOutputNode) {
      throw new Error('Audio engine effect chain is not initialized.');
    }

    const synth = new Tone.PolySynth(resolveVoiceConstructor(definition.voice), definition.options as never).connect(
      this.instrumentOutputNode,
    );
    if (this.instrumentReverbNode) {
      synth.connect(this.instrumentReverbNode);
    }

    return synth;
  }
}
