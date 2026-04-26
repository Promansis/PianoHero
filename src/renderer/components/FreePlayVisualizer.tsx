import { FreePlayCanvasScene } from './FreePlayCanvasScene';
import {
  FREE_PLAY_VISUAL_MODE_OPTIONS,
  type FreePlayVisualMode,
  type FreePlayVisualNote,
  type VisualPreset,
} from './FreePlayVisualTypes';
interface FreePlayVisualizerProps {
  mode: FreePlayVisualMode;
  activeNotes: number[];
  recentNotes: FreePlayVisualNote[];
  resetToken: number;
  sustainOn: boolean;
  metronomeEnabled: boolean;
  metronomeBeat: number;
  visualPreset: VisualPreset;
}

export { FREE_PLAY_VISUAL_MODE_OPTIONS };
export type { FreePlayVisualMode, FreePlayVisualNote, VisualPreset };

export function FreePlayVisualizer({
  mode,
  activeNotes,
  recentNotes,
  resetToken,
  sustainOn,
  metronomeEnabled,
  metronomeBeat,
  visualPreset,
}: FreePlayVisualizerProps) {
  const modeMeta =
    FREE_PLAY_VISUAL_MODE_OPTIONS.find((option) => option.value === mode) ?? FREE_PLAY_VISUAL_MODE_OPTIONS[0];

  return (
    <section className={`free-play-visualizer free-play-visualizer-${mode}`} aria-label={`${modeMeta.label} visualizer`}>
      <FreePlayCanvasScene
        mode={mode}
        activeNotes={activeNotes}
        recentNotes={recentNotes}
        resetToken={resetToken}
        sustainOn={sustainOn}
        metronomeEnabled={metronomeEnabled}
        metronomeBeat={metronomeBeat}
        visualPreset={visualPreset}
      />
    </section>
  );
}
