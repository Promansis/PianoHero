export type InstrumentVoice = 'synth' | 'am' | 'fm' | 'mono' | 'sampler';
export type InstrumentReverbPreset = 'short' | 'medium' | 'hall';

export const REVERB_PRESETS: Record<InstrumentReverbPreset, { roomSize: number; dampening: number }> = {
  short:  { roomSize: 0.25, dampening: 3500 },
  medium: { roomSize: 0.55, dampening: 2500 },
  hall:   { roomSize: 0.80, dampening: 1500 },
};

export interface InstrumentDefinition {
  id: string;
  label: string;
  description: string;
  voice: InstrumentVoice;
  options: Record<string, unknown>;
  sampleBaseUrl?: string;
  sampleUrls?: Record<string, string>;
  reverbPreset?: InstrumentReverbPreset;
  requiredRewardId?: string;
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

const PHILHARMONIA_FLUTE_SAMPLE_MAP = {
  A4: 'flute_A4_15_piano_normal.mp3',
  C5: 'flute_C5_15_piano_normal.mp3',
  A5: 'flute_A5_15_piano_normal.mp3',
  C6: 'flute_C6_15_mezzo-piano_normal.mp3',
  A6: 'flute_A6_15_piano_normal.mp3',
} as const;

const PHILHARMONIA_CLARINET_SAMPLE_MAP = {
  A3: 'clarinet_A3_15_piano_normal.mp3',
  C4: 'clarinet_C4_15_piano_normal.mp3',
  A4: 'clarinet_A4_15_piano_normal.mp3',
  C5: 'clarinet_C5_15_piano_normal.mp3',
  A5: 'clarinet_A5_15_piano_normal.mp3',
  C6: 'clarinet_C6_15_piano_normal.mp3',
} as const;

const PHILHARMONIA_TRUMPET_SAMPLE_MAP = {
  'A#3': 'trumpet_As3_long_piano_normal.mp3',
  A4: 'trumpet_A4_long_piano_normal.mp3',
  C5: 'trumpet_C5_long_piano_normal.mp3',
  A5: 'trumpet_A5_15_mezzo-forte_normal.mp3',
} as const;

const PHILHARMONIA_FRENCH_HORN_SAMPLE_MAP = {
  A2: 'french-horn_A2_15_piano_normal.mp3',
  C3: 'french-horn_C3_15_piano_normal.mp3',
  A3: 'french-horn_A3_15_piano_normal.mp3',
  C4: 'french-horn_C4_15_piano_normal.mp3',
  A4: 'french-horn_A4_15_piano_normal.mp3',
  C5: 'french-horn_C5_15_piano_normal.mp3',
} as const;

// nbrosowsky/tonejs-instruments (MIT) — downloaded by scripts/download-samples.mjs
const NBROSOWSKY_ORGAN_SAMPLE_MAP = {
  A1: 'A1.mp3', A2: 'A2.mp3', A3: 'A3.mp3', A4: 'A4.mp3', A5: 'A5.mp3',
  C1: 'C1.mp3', C2: 'C2.mp3', C3: 'C3.mp3', C4: 'C4.mp3', C5: 'C5.mp3', C6: 'C6.mp3',
  'D#1': 'Ds1.mp3', 'D#2': 'Ds2.mp3', 'D#3': 'Ds3.mp3', 'D#4': 'Ds4.mp3', 'D#5': 'Ds5.mp3',
  'F#1': 'Fs1.mp3', 'F#2': 'Fs2.mp3', 'F#3': 'Fs3.mp3', 'F#4': 'Fs4.mp3', 'F#5': 'Fs5.mp3',
} as const;

const NBROSOWSKY_HARP_SAMPLE_MAP = {
  A2: 'A2.mp3', A4: 'A4.mp3', A6: 'A6.mp3',
  B1: 'B1.mp3', B3: 'B3.mp3', B5: 'B5.mp3', B6: 'B6.mp3',
  C3: 'C3.mp3', C5: 'C5.mp3',
  D2: 'D2.mp3', D4: 'D4.mp3', D6: 'D6.mp3', D7: 'D7.mp3',
  E1: 'E1.mp3', E3: 'E3.mp3', E5: 'E5.mp3',
  F2: 'F2.mp3', F4: 'F4.mp3', F6: 'F6.mp3', F7: 'F7.mp3',
  G1: 'G1.mp3', G3: 'G3.mp3', G5: 'G5.mp3',
} as const;

const NBROSOWSKY_XYLOPHONE_SAMPLE_MAP = {
  G4: 'G4.mp3', G5: 'G5.mp3', G6: 'G6.mp3', G7: 'G7.mp3',
  C5: 'C5.mp3', C6: 'C6.mp3', C7: 'C7.mp3', C8: 'C8.mp3',
} as const;

const NBROSOWSKY_VIBRAPHONE_SAMPLE_MAP = {
  A3: 'A3.mp3', A4: 'A4.mp3', A5: 'A5.mp3',
  C3: 'C3.mp3', C4: 'C4.mp3', C5: 'C5.mp3', C6: 'C6.mp3',
  'D#4': 'Ds4.mp3', 'D#5': 'Ds5.mp3',
  'F#4': 'Fs4.mp3', 'F#5': 'Fs5.mp3',
} as const;

const NBROSOWSKY_BASS_ELECTRIC_SAMPLE_MAP = {
  'A#1': 'As1.mp3', 'A#2': 'As2.mp3', 'A#3': 'As3.mp3', 'A#4': 'As4.mp3',
  'C#1': 'Cs1.mp3', 'C#2': 'Cs2.mp3', 'C#3': 'Cs3.mp3', 'C#4': 'Cs4.mp3', 'C#5': 'Cs5.mp3',
  E1: 'E1.mp3', E2: 'E2.mp3', E3: 'E3.mp3', E4: 'E4.mp3',
  G1: 'G1.mp3', G2: 'G2.mp3', G3: 'G3.mp3', G4: 'G4.mp3',
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
    sampleBaseUrl: '/samples/salamander/',
    sampleUrls: SALAMANDER_SAMPLE_MAP,
    reverbPreset: 'medium',
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
    description: 'Sampled pipe organ with a full, sustained tone.',
    voice: 'sampler',
    options: {
      release: 0.5,
    },
    sampleBaseUrl: '/samples/nbrosowsky/organ/',
    sampleUrls: NBROSOWSKY_ORGAN_SAMPLE_MAP,
    reverbPreset: 'hall',
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
    reverbPreset: 'short',
  },
  {
    id: 'warm-pad',
    label: 'Warm Pad',
    description: 'A wide, slow synth pad for ambient practice.',
    voice: 'am',
    reverbPreset: 'hall',
    requiredRewardId: 'instrument:warm-pad',
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
    description: 'Private-use Philharmonia flute samples for a more natural melody voice.',
    voice: 'sampler',
    options: {
      release: 1.1,
    },
    sampleBaseUrl: '/samples/philharmonia/flute/',
    sampleUrls: PHILHARMONIA_FLUTE_SAMPLE_MAP,
    reverbPreset: 'short',
  },
  {
    id: 'clarinet',
    label: 'Clarinet',
    description: 'Private-use Philharmonia clarinet samples with a warm centered tone.',
    voice: 'sampler',
    options: {
      release: 1.2,
    },
    sampleBaseUrl: '/samples/philharmonia/clarinet/',
    sampleUrls: PHILHARMONIA_CLARINET_SAMPLE_MAP,
    reverbPreset: 'short',
  },
  {
    id: 'trumpet',
    label: 'Trumpet',
    description: 'Private-use Philharmonia trumpet samples for bright fanfare lines.',
    voice: 'sampler',
    options: {
      release: 0.9,
    },
    sampleBaseUrl: '/samples/philharmonia/trumpet/',
    sampleUrls: PHILHARMONIA_TRUMPET_SAMPLE_MAP,
    reverbPreset: 'medium',
  },
  {
    id: 'french-horn',
    label: 'French Horn',
    description: 'Private-use Philharmonia horn samples with a rounded orchestral color.',
    voice: 'sampler',
    options: {
      release: 1.2,
    },
    sampleBaseUrl: '/samples/philharmonia/french-horn/',
    sampleUrls: PHILHARMONIA_FRENCH_HORN_SAMPLE_MAP,
    reverbPreset: 'hall',
  },
  {
    id: 'marimba',
    label: 'Marimba',
    description: 'Sampled harp, giving a resonant plucked character with natural decay.',
    voice: 'sampler',
    options: {
      release: 0.8,
    },
    sampleBaseUrl: '/samples/nbrosowsky/harp/',
    sampleUrls: NBROSOWSKY_HARP_SAMPLE_MAP,
    reverbPreset: 'medium',
  },
  {
    id: 'bell',
    label: 'Bell',
    description: 'Sampled xylophone/glockenspiel for a bright, metallic tone.',
    voice: 'sampler',
    options: {
      release: 1.5,
    },
    sampleBaseUrl: '/samples/nbrosowsky/xylophone/',
    sampleUrls: NBROSOWSKY_XYLOPHONE_SAMPLE_MAP,
    reverbPreset: 'medium',
  },
  {
    id: 'vibraphone',
    label: 'Vibraphone',
    description: 'Sampled vibraphone with a warm metallic resonance and natural decay.',
    voice: 'sampler',
    options: {
      release: 1.8,
    },
    sampleBaseUrl: '/samples/nbrosowsky/vibraphone/',
    sampleUrls: NBROSOWSKY_VIBRAPHONE_SAMPLE_MAP,
    reverbPreset: 'medium',
  },
  {
    id: 'bass',
    label: 'Bass',
    description: 'Sampled electric bass for a punchy, low-end voice on left-hand lines.',
    voice: 'sampler',
    options: {
      release: 0.4,
    },
    sampleBaseUrl: '/samples/nbrosowsky/bass-electric/',
    sampleUrls: NBROSOWSKY_BASS_ELECTRIC_SAMPLE_MAP,
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
    id: 'synth-lead',
    label: 'Synth Lead',
    description: 'A bright sawtooth lead with a punchy attack, great for melodic lines.',
    voice: 'fm',
    options: {
      harmonicity: 1,
      modulationIndex: 2.5,
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.8,
        release: 0.4,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0.5,
        release: 0.2,
      },
    },
  },
  {
    id: 'rhodes',
    label: 'Rhodes EP',
    description: 'A warm electric piano with a richer bell-like character than the standard EP.',
    voice: 'fm',
    options: {
      harmonicity: 3.5,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.002,
        decay: 0.8,
        sustain: 0.1,
        release: 2.0,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.0,
        release: 0.8,
      },
    },
    reverbPreset: 'medium',
  },
  {
    id: 'honky-tonk',
    label: 'Honky-Tonk',
    description: 'Detuned twin-oscillator piano sound with an old saloon character.',
    voice: 'am',
    requiredRewardId: 'instrument:honky-tonk',
    options: {
      harmonicity: 1.008,
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.002,
        decay: 0.4,
        sustain: 0.15,
        release: 0.9,
      },
      modulation: { type: 'triangle' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0.05,
        release: 0.4,
      },
    },
    reverbPreset: 'short',
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
export const DEFAULT_WEB_INSTRUMENT_ID = 'electric-piano';

export function getInstrumentDefinition(instrumentId: string): InstrumentDefinition {
  return INSTRUMENTS.find((instrument) => instrument.id === instrumentId) ?? INSTRUMENTS[0];
}

export function isInstrumentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && INSTRUMENTS.some((instrument) => instrument.id === value);
}
