export type InstrumentVoice = 'synth' | 'am' | 'fm' | 'mono' | 'sampler';

export interface InstrumentDefinition {
  id: string;
  label: string;
  description: string;
  voice: InstrumentVoice;
  options: Record<string, unknown>;
  sampleBaseUrl?: string;
  sampleUrls?: Record<string, string>;
}

const SALAMANDER_SAMPLE_MAP = {
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

export const INSTRUMENTS: InstrumentDefinition[] = [
  {
    id: 'acoustic-piano',
    label: 'Acoustic Piano',
    description: 'Sampled Salamander piano, with a synth fallback if samples fail to load.',
    voice: 'sampler',
    options: {
      release: 1.2,
    },
    sampleBaseUrl: 'https://tonejs.github.io/audio/salamander/',
    sampleUrls: SALAMANDER_SAMPLE_MAP,
  },
  {
    id: 'electric-piano',
    label: 'Electric Piano',
    description: 'A softer tine-style keyboard with a rounded attack.',
    voice: 'fm',
    options: {
      harmonicity: 3.1,
      modulationIndex: 4.5,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.004,
        decay: 0.45,
        sustain: 0.28,
        release: 1.4,
      },
      modulation: { type: 'triangle' },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0.08,
        release: 0.6,
      },
    },
  },
  {
    id: 'organ',
    label: 'Organ',
    description: 'Full sustained tone without a piano-like decay.',
    voice: 'synth',
    options: {
      oscillator: { type: 'sine4' },
      envelope: {
        attack: 0.01,
        decay: 0.08,
        sustain: 0.95,
        release: 0.35,
      },
    },
  },
  {
    id: 'harpsichord',
    label: 'Harpsichord',
    description: 'Sharp pluck-like attack with very little sustain.',
    voice: 'synth',
    options: {
      oscillator: { type: 'square3' },
      envelope: {
        attack: 0.001,
        decay: 0.18,
        sustain: 0.02,
        release: 0.12,
      },
    },
  },
  {
    id: 'warm-pad',
    label: 'Warm Pad',
    description: 'A wide, slow synth pad for ambient practice.',
    voice: 'am',
    options: {
      harmonicity: 1.5,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.09,
        decay: 0.4,
        sustain: 0.75,
        release: 2.8,
      },
      modulation: { type: 'triangle' },
      modulationEnvelope: {
        attack: 0.06,
        decay: 0.3,
        sustain: 0.7,
        release: 2.2,
      },
    },
  },
  {
    id: 'flute',
    label: 'Flute',
    description: 'A breathy lead voice that works well for melodies.',
    voice: 'mono',
    options: {
      oscillator: { type: 'triangle' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: {
        attack: 0.03,
        decay: 0.15,
        sustain: 0.7,
        release: 0.7,
      },
      filterEnvelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8,
        baseFrequency: 700,
        octaves: 2,
      },
    },
  },
  {
    id: 'marimba',
    label: 'Marimba',
    description: 'Percussive mallet attack with woody decay.',
    voice: 'fm',
    options: {
      harmonicity: 1.4,
      modulationIndex: 12,
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.001,
        decay: 0.32,
        sustain: 0,
        release: 0.28,
      },
      modulation: { type: 'square' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.14,
        sustain: 0,
        release: 0.12,
      },
    },
  },
  {
    id: 'bell',
    label: 'Bell',
    description: 'Glassy, metallic tone for interval and melody drills.',
    voice: 'fm',
    options: {
      harmonicity: 7,
      modulationIndex: 18,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 1.2,
        sustain: 0,
        release: 1.8,
      },
      modulation: { type: 'square' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0,
        release: 0.8,
      },
    },
  },
  {
    id: 'bass',
    label: 'Synth Bass',
    description: 'Low, punchy voice that exaggerates left-hand lines.',
    voice: 'mono',
    options: {
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      envelope: {
        attack: 0.01,
        decay: 0.18,
        sustain: 0.45,
        release: 0.35,
      },
      filterEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0.1,
        release: 0.3,
        baseFrequency: 120,
        octaves: 2.5,
      },
    },
  },
  {
    id: '8-bit',
    label: '8-Bit',
    description: 'Classic square-wave game console flavor.',
    voice: 'synth',
    options: {
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0.4,
        release: 0.12,
      },
    },
  },
  {
    id: 'laser',
    label: 'Laser',
    description: 'An intentionally over-the-top sci-fi lead.',
    voice: 'am',
    options: {
      harmonicity: 4,
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.002,
        decay: 0.12,
        sustain: 0.25,
        release: 0.2,
      },
      modulation: { type: 'square' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0.1,
        release: 0.1,
      },
    },
  },
  {
    id: 'bubbles',
    label: 'Bubbles',
    description: 'A playful blippy voice for novelty practice.',
    voice: 'fm',
    options: {
      harmonicity: 1.1,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.003,
        decay: 0.16,
        sustain: 0.18,
        release: 0.22,
      },
      modulation: { type: 'triangle' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0.05,
        release: 0.08,
      },
    },
  },
];

export const DEFAULT_INSTRUMENT_ID = 'acoustic-piano';

export function getInstrumentDefinition(instrumentId: string): InstrumentDefinition {
  return INSTRUMENTS.find((instrument) => instrument.id === instrumentId) ?? INSTRUMENTS[0];
}

export function isInstrumentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && INSTRUMENTS.some((instrument) => instrument.id === value);
}
