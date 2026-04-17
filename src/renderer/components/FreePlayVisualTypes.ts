export type VisualPreset = 'subtle' | 'balanced' | 'vivid';

export type FreePlayVisualMode =
  | 'concert-stage'
  | 'classic-piano'
  | 'color-ribbons'
  | 'pulse-orbit'
  | 'constellation'
  | 'scale-heatmap'
  | 'ink-in-water'
  | 'tree-of-light'
  | 'particle-galaxy'
  | 'aurora-borealis'
  | 'fireworks'
  | 'sacred-geometry'
  | 'bubble-pop';

export interface FreePlayVisualNote {
  id: string;
  midi: number;
  velocity: number;
  createdAt: number;
  source: 'live' | 'playback';
}

export const FREE_PLAY_VISUAL_MODE_OPTIONS: Array<{
  value: FreePlayVisualMode;
  label: string;
  description: string;
  requiredRewardId?: string;
}> = [
  {
    value: 'concert-stage',
    label: 'Concert Stage',
    description: 'Spotlights, stage haze, and note-driven light bursts.',
  },
  {
    value: 'classic-piano',
    label: 'Classic Piano',
    description: 'A restrained performance look with the keyboard front and center.',
  },
  {
    value: 'color-ribbons',
    label: 'Color Ribbons',
    description: 'Each note leaves a vivid ribbon trail across the stage.',
  },
  {
    value: 'pulse-orbit',
    label: 'Pulse Orbit',
    description: 'Harmony blooms into circular pulses around a central core.',
  },
  {
    value: 'constellation',
    label: 'Constellation',
    description: 'Recent notes connect into temporary star maps and motifs.',
  },
  {
    value: 'scale-heatmap',
    label: 'Scale Heatmap',
    description: 'A practice-focused view of pitch-class balance and register use.',
  },
  {
    value: 'ink-in-water',
    label: 'Ink in Water',
    description: 'Warm and cool ink blooms diffuse into a watercolor built from your session.',
  },
  {
    value: 'tree-of-light',
    label: 'Tree of Light',
    description: 'Roots, branches, leaves, and blossoms grow into a luminous tree as you play.',
  },
  {
    value: 'particle-galaxy',
    label: 'Particle Galaxy',
    description: 'Notes seed spiral arms around a gravity well, with sustain triggering supernovas.',
    requiredRewardId: 'visual:particle-galaxy',
  },
  {
    value: 'aurora-borealis',
    label: 'Aurora Borealis',
    description: 'Pitch paints shimmering northern-light ribbons that intensify with harmony.',
    requiredRewardId: 'visual:aurora-borealis',
  },
  {
    value: 'fireworks',
    label: 'Fireworks',
    description: 'Notes launch shells and chord bursts across a sky that warms with your energy.',
  },
  {
    value: 'sacred-geometry',
    label: 'Sacred Geometry',
    description: 'Notes bloom into rotating geometric rings that overlap into mandalas.',
    requiredRewardId: 'visual:sacred-geometry',
  },
  {
    value: 'bubble-pop',
    label: 'Bubble Pop',
    description: 'Colourful bubbles float up and pop as you play — great for young children.',
  },
];
