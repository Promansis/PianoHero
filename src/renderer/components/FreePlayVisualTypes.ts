export type FreePlayVisualMode =
  | 'concert-stage'
  | 'classic-piano'
  | 'color-ribbons'
  | 'pulse-orbit'
  | 'constellation'
  | 'scale-heatmap';

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
];
