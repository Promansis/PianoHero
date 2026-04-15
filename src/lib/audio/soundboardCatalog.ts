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

const CLASSIC_SOUND_SOURCE = 'Philharmonia Orchestra Sound Samples';

const CLASSIC_DATA: Array<Omit<SoundboardClip, 'midi' | 'source'>> = [
  { id: 'bass-boom', label: 'Bass Boom', shortLabel: 'Boom', category: 'drum', src: '/soundboard/bass-drum__025_forte_bass-drum-mallet.mp3', gainDb: -5 },
  { id: 'bass-flam', label: 'Bass Flam', shortLabel: 'Flam', category: 'drum', src: '/soundboard/bass-drum__1_mezzo-forte_flam.mp3', gainDb: -6 },
  { id: 'bass-rumble', label: 'Bass Rumble', shortLabel: 'Rumb', category: 'drum', src: '/soundboard/bass-drum__15_mezzo-piano_rhythm.mp3', gainDb: -7 },
  { id: 'surdo-thump', label: 'Surdo Thump', shortLabel: 'Thump', category: 'drum', src: '/soundboard/surdo__05_forte_undamped.mp3', gainDb: -6 },
  { id: 'tenor-drum', label: 'Tenor Drum', shortLabel: 'Tenor', category: 'drum', src: '/soundboard/tenor-drum__phrase_forte_damped.mp3', gainDb: -6 },
  { id: 'tom-hit', label: 'Tom Hit', shortLabel: 'Tom', category: 'drum', src: '/soundboard/tom-toms__05_mezzo-forte_struck-singly.mp3', gainDb: -5 },
  { id: 'djembe-hit', label: 'Djembe Hit', shortLabel: 'Djem', category: 'drum', src: '/soundboard/djembe__05_forte_undamped.mp3', gainDb: -5 },
  { id: 'djembe-groove', label: 'Djembe Groove', shortLabel: 'Groov', category: 'drum', src: '/soundboard/djembe__phrase_mezzo-forte_rhythm.mp3', gainDb: -7 },
  { id: 'djundjun-hit', label: 'Djundjun Hit', shortLabel: 'Djun', category: 'drum', src: '/soundboard/djundjun__05_mezzo-forte_struck-singly.mp3', gainDb: -6 },
  { id: 'djundjun-rhythm', label: 'Djundjun Rhythm', shortLabel: 'Rhyth', category: 'drum', src: '/soundboard/djundjun__phrase_mezzo-forte_rhythm.mp3', gainDb: -7 },
  { id: 'woodblock', label: 'Woodblock', shortLabel: 'Block', category: 'impact', src: '/soundboard/woodblock__025_mezzo-forte_struck-singly.mp3', gainDb: -5 },
  { id: 'board-scrape', label: 'Board Scrape', shortLabel: 'Scrap', category: 'scrape', src: '/soundboard/washboard__025_forte_scraped.mp3', gainDb: -6 },
  { id: 'board-riff', label: 'Board Riff', shortLabel: 'Riff', category: 'scrape', src: '/soundboard/washboard__phrase_forte_scraped.mp3', gainDb: -7 },
  { id: 'guiro-tap', label: 'Guiro Tap', shortLabel: 'Tap', category: 'scrape', src: '/soundboard/guiro__025_mezzo-forte_struck-singly.mp3', gainDb: -5 },
  { id: 'guiro-scrape', label: 'Guiro Scrape', shortLabel: 'Guiro', category: 'scrape', src: '/soundboard/guiro__05_mezzo-forte_scraped.mp3', gainDb: -6 },
  { id: 'guiro-riff', label: 'Guiro Riff', shortLabel: 'Skrrt', category: 'scrape', src: '/soundboard/guiro__phrase_mezzo-forte_scraped.mp3', gainDb: -7 },
  { id: 'ratchet-tick', label: 'Ratchet Tick', shortLabel: 'Tick', category: 'shuffle', src: '/soundboard/ratchet__025_forte_clean.mp3', gainDb: -5 },
  { id: 'ratchet-roll', label: 'Ratchet Roll', shortLabel: 'Buzz', category: 'shuffle', src: '/soundboard/ratchet__long_forte_roll.mp3', gainDb: -6 },
  { id: 'cabasa-tick', label: 'Cabasa Tick', shortLabel: 'Cabas', category: 'shuffle', src: '/soundboard/cabasa__025_mezzo-forte_effect.mp3', gainDb: -6 },
  { id: 'cabasa-swirl', label: 'Cabasa Swirl', shortLabel: 'Swirl', category: 'shuffle', src: '/soundboard/cabasa__phrase_mezzo-forte_effect.mp3', gainDb: -7 },
  { id: 'toenail-shake', label: 'Toenail Shake', shortLabel: 'Nails', category: 'shuffle', src: '/soundboard/sheeps-toenails__025_mezzo-forte_shaken.mp3', gainDb: -6 },
  { id: 'banana-shake', label: 'Banana Shake', shortLabel: 'Bana', category: 'shuffle', src: '/soundboard/banana-shaker__long_forte_shaken.mp3', gainDb: -7 },
  { id: 'lemon-shake', label: 'Lemon Shake', shortLabel: 'Lemn', category: 'shuffle', src: '/soundboard/lemon-shaker__long_mezzo-forte_shaken.mp3', gainDb: -7 },
  { id: 'berry-shake', label: 'Berry Shake', shortLabel: 'Berry', category: 'shuffle', src: '/soundboard/strawberry-shaker__phrase_mezzo-forte_rhythm.mp3', gainDb: -7 },
  { id: 'tamb-hit', label: 'Tamb Hit', shortLabel: 'Tamb', category: 'jingle', src: '/soundboard/tambourine__025_forte_hand.mp3', gainDb: -5 },
  { id: 'tamb-jam', label: 'Tamb Jam', shortLabel: 'Jam', category: 'jingle', src: '/soundboard/tambourine__phrase_mezzo-forte_hand.mp3', gainDb: -7 },
  { id: 'jingle-short', label: 'Jingle Short', shortLabel: 'Jing', category: 'jingle', src: '/soundboard/sleigh-bells__05_mezzo-forte_shaken.mp3', gainDb: -5 },
  { id: 'jingle-long', label: 'Jingle Long', shortLabel: 'Trail', category: 'jingle', src: '/soundboard/sleigh-bells__very-long_mezzo-forte_shaken.mp3', gainDb: -7 },
  { id: 'agogo-hit', label: 'Agogo Hit', shortLabel: 'Agogo', category: 'metal', src: '/soundboard/agogo-bells__025_mezzo-forte_struck-singly.mp3', gainDb: -5 },
  { id: 'agogo-riff', label: 'Agogo Riff', shortLabel: 'Bells', category: 'metal', src: '/soundboard/agogo-bells__phrase_mezzo-forte_rhythm.mp3', gainDb: -7 },
  { id: 'cowbell-damp', label: 'Cowbell Damp', shortLabel: 'Cow', category: 'metal', src: '/soundboard/cowbell__025_mezzo-forte_damped.mp3', gainDb: -5 },
  { id: 'cowbell-ring', label: 'Cowbell Ring', shortLabel: 'Ding', category: 'metal', src: '/soundboard/cowbell__1_forte_undamped.mp3', gainDb: -5 },
  { id: 'castanet-click', label: 'Castanet Click', shortLabel: 'Clack', category: 'impact', src: '/soundboard/castanets__025_mezzo-forte_struck-singly.mp3', gainDb: -5 },
  { id: 'castanet-roll', label: 'Castanet Roll', shortLabel: 'Roll', category: 'impact', src: '/soundboard/castanets__long_mezzo-forte_roll.mp3', gainDb: -6 },
  { id: 'train-peep', label: 'Train Peep', shortLabel: 'Peep', category: 'horn', src: '/soundboard/train-whistle__025_forte_clean.mp3', gainDb: -5 },
  { id: 'bike-horn', label: 'Bike Horn', shortLabel: 'Honk', category: 'horn', src: '/soundboard/motor-horn__05_forte_squeezed.mp3', gainDb: -4 },
  { id: 'toot-short', label: 'Toot Short', shortLabel: 'Toot', category: 'horn', src: '/soundboard/swanee-whistle__05_forte_effect.mp3', gainDb: -6 },
  { id: 'toot-pop', label: 'Toot Pop', shortLabel: 'Pop', category: 'horn', src: '/soundboard/swanee-whistle__1_forte_effect.mp3', gainDb: -6 },
  { id: 'train-call', label: 'Train Call', shortLabel: 'Train', category: 'horn', src: '/soundboard/train-whistle__1_forte_effect.mp3', gainDb: -5 },
  { id: 'flex-shake', label: 'Flex Shake', shortLabel: 'Flex', category: 'sparkle', src: '/soundboard/flexatone__05_forte_shaken.mp3', gainDb: -6 },
  { id: 'flex-wobble', label: 'Flex Wobble', shortLabel: 'Wobbl', category: 'sparkle', src: '/soundboard/flexatone__very-long_forte_effect.mp3', gainDb: -7 },
  { id: 'vibra-hit', label: 'Vibraslap Hit', shortLabel: 'Vibra', category: 'sparkle', src: '/soundboard/vibraslap__05_forte_damped.mp3', gainDb: -6 },
  { id: 'vibra-buzz', label: 'Vibraslap Buzz', shortLabel: 'Buzz2', category: 'sparkle', src: '/soundboard/vibraslap__very-long_forte_undamped.mp3', gainDb: -7 },
  { id: 'spring-tap', label: 'Spring Tap', shortLabel: 'Boing', category: 'sparkle', src: '/soundboard/spring-coil__05_mezzo-forte_struck-singly.mp3', gainDb: -6 },
  { id: 'spring-rise', label: 'Spring Rise', shortLabel: 'Boop', category: 'sparkle', src: '/soundboard/spring-coil__1_mezzo-forte_glissando.mp3', gainDb: -6 },
  { id: 'spring-zap', label: 'Spring Zap', shortLabel: 'Zap', category: 'sparkle', src: '/soundboard/spring-coil__long_forte_glissando.mp3', gainDb: -6 },
  { id: 'rubber-squeak', label: 'Rubber Squeak', shortLabel: 'Squeak', category: 'horn', src: '/soundboard/squeaker__05_forte_squeezed.mp3', gainDb: -3 },
  { id: 'whip-snap', label: 'Whip Snap', shortLabel: 'Whip', category: 'impact', src: '/soundboard/whip__025_forte_struck-together.mp3', gainDb: -4 },
  { id: 'whip-crack', label: 'Whip Crack', shortLabel: 'Crack', category: 'impact', src: '/soundboard/whip__phrase_forte_struck-together.mp3', gainDb: -5 },
  { id: 'bell-tap', label: 'Bell Tap', shortLabel: 'Bell', category: 'sparkle', src: '/soundboard/bell-tree__025_forte_struck-singly.mp3', gainDb: -4 },
  { id: 'bell-sweep', label: 'Bell Sweep', shortLabel: 'Sweep', category: 'sparkle', src: '/soundboard/bell-tree__long_forte_glissando.mp3', gainDb: -4 },
  { id: 'wind-chime', label: 'Wind Chime', shortLabel: 'Chime', category: 'sparkle', src: '/soundboard/wind-chimes__long_mezzo-piano_hand.mp3', gainDb: -7 },
  { id: 'triangle-ting', label: 'Triangle Ting', shortLabel: 'Ting', category: 'metal', src: '/soundboard/triangle__long_piano_struck-singly.mp3', gainDb: -7 },
  { id: 'triangle-riff', label: 'Triangle Riff', shortLabel: 'Tri', category: 'metal', src: '/soundboard/triangle__phrase_mezzo-piano_damped.mp3', gainDb: -7 },
  { id: 'hand-cym-hit', label: 'Hand Cym Hit', shortLabel: 'Chnk', category: 'metal', src: '/soundboard/chinese-hand-cymbals__1_mezzo-forte_struck-together.mp3', gainDb: -6 },
  { id: 'hand-cym-rhythm', label: 'Hand Cym Rhythm', shortLabel: 'Jangl', category: 'metal', src: '/soundboard/chinese-hand-cymbals__very-long_mezzo-forte_rhythm.mp3', gainDb: -7 },
  { id: 'clash-hit', label: 'Clash Hit', shortLabel: 'Clash', category: 'metal', src: '/soundboard/clash-cymbals__025_mezzo-forte_undamped.mp3', gainDb: -5 },
  { id: 'clash-crash', label: 'Clash Crash', shortLabel: 'Crash', category: 'metal', src: '/soundboard/clash-cymbals__long_fortissimo_struck-together.mp3', gainDb: -6 },
  { id: 'suspended-scrape', label: 'Suspended Scrape', shortLabel: 'Shhh', category: 'scrape', src: '/soundboard/suspended-cymbal__1_forte_scraped.mp3', gainDb: -7 },
  { id: 'gong-ring', label: 'Gong Ring', shortLabel: 'Gong', category: 'metal', src: '/soundboard/Thai-gong__long_forte_undamped.mp3', gainDb: -7 },
  { id: 'tamtam-wash', label: 'Tam-Tam Wash', shortLabel: 'Wash', category: 'metal', src: '/soundboard/tam-tam__long_mezzo-piano_undamped.mp3', gainDb: -8 },
];

const CLASSIC_CLIPS: SoundboardClip[] = CLASSIC_DATA.map((clip, index) => ({
  ...clip,
  midi: SOUNDBOARD_MIN_MIDI + index,
  source: CLASSIC_SOUND_SOURCE,
}));

const ANIMAL_CLIPS: SoundboardClip[] = animalManifest as SoundboardClip[];

export const SOUNDBOARD_MODES: SoundboardModeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Percussion toys, jingles, horns, and silly sparkles.',
    heading: 'Play novelty sounds from the keyboard',
    copy: 'Use your piano or the computer-keyboard mapping. Only labeled keys trigger sounds.',
    statusTemplate: (clip) => `Played ${clip.label}.`,
    clipSourceLabel: CLASSIC_SOUND_SOURCE,
    creditsHeading: 'Bundled orchestral percussion credits',
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
