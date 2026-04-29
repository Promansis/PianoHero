import classicManifest from './classicSoundboardManifest.json';
import animalManifest from './animalSoundboardManifest.json';

export type SoundboardCategory =
  | 'drum'
  | 'shuffle'
  | 'jingle'
  | 'horn'
  | 'sparkle'
  | 'metal'
  | 'scrape'
  | 'impact'
  | 'arcade'
  | 'toy'
  | 'magic'
  | 'vehicle'
  | 'alert'
  | 'weather'
  | 'voice'
  | 'object'
  | 'music'
  | 'pet'
  | 'farm'
  | 'bird'
  | 'wild'
  | 'bug';

export type SoundboardModeId = 'classic' | 'animals';

export interface SoundboardClip {
  id: string;
  label: string;
  shortLabel: string;
  category: SoundboardCategory;
  emoji?: string;
  accent?: string;
  midi: number;
  src: string;
  gainDb: number;
  source: string;
  visualSrc?: string;
  attribution?: string;
  author?: string;
  license?: string;
  sourcePage?: string;
  sourceTitle?: string;
  description?: string;
}

export interface SoundboardModeDefinition {
  id: SoundboardModeId;
  label: string;
  description: string;
  heading: string;
  copy: string;
  statusTemplate: (clip: SoundboardClip) => string;
  clipSourceLabel: string;
  creditsHeading: string;
  clips: SoundboardClip[];
}

export const SOUNDBOARD_MIN_MIDI = 36;
export const SOUNDBOARD_MAX_MIDI = 96;

const CLASSIC_SOUND_SOURCE = 'Mixkit recorded sound effect samples';
const CLASSIC_CLIPS: SoundboardClip[] = classicManifest as SoundboardClip[];
const ANIMAL_CLIPS: SoundboardClip[] = animalManifest as SoundboardClip[];

export const SOUNDBOARD_MODES: SoundboardModeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Recorded cartoon, voice, foley, object, vehicle, alert, weather, and pet samples.',
    heading: 'Play novelty sounds from the keyboard',
    copy: 'Each labeled key triggers a short recorded sample with a matching emoji.',
    statusTemplate: (clip) => `Played ${clip.label}.`,
    clipSourceLabel: CLASSIC_SOUND_SOURCE,
    creditsHeading: 'Classic sample credits',
    clips: CLASSIC_CLIPS,
  },
  {
    id: 'animals',
    label: 'Animals',
    description: 'Real animal calls with bubble-pop cartoon sprites.',
    heading: 'Play animal sounds from the keyboard',
    copy: 'Each key triggers an animal sound and launches a floating cartoon sprite from that key.',
    statusTemplate: (clip) => `${clip.label} pops out of the keyboard.`,
    clipSourceLabel: 'Mixed sourced animal recordings',
    creditsHeading: 'Animal sound credits',
    clips: ANIMAL_CLIPS,
  },
];

export const DEFAULT_SOUNDBOARD_MODE_ID: SoundboardModeId = 'classic';

export const SOUNDBOARD_CLIPS = CLASSIC_CLIPS;

export function getSoundboardMode(modeId: SoundboardModeId): SoundboardModeDefinition {
  return SOUNDBOARD_MODES.find((mode) => mode.id === modeId) ?? SOUNDBOARD_MODES[0];
}

export function getSoundboardClipForMidi(modeId: SoundboardModeId, midi: number): SoundboardClip | undefined {
  const mode = getSoundboardMode(modeId);
  const index = midi - SOUNDBOARD_MIN_MIDI;
  if (index < 0 || index >= mode.clips.length) {
    return undefined;
  }
  return mode.clips[index];
}
