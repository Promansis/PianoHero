import { FreePlayCanvasScene } from './FreePlayCanvasScene';
import {
  FREE_PLAY_VISUAL_MODE_OPTIONS,
  type FreePlayVisualMode,
  type FreePlayVisualNote,
  type VisualPreset,
} from './FreePlayVisualTypes';
import { formatRecordingTimer } from './freePlayVisualState';

interface FreePlayVisualizerProps {
  mode: FreePlayVisualMode;
  activeNotes: number[];
  recentNotes: FreePlayVisualNote[];
  chordLabel: string | null;
  sustainOn: boolean;
  metronomeEnabled: boolean;
  metronomeBeat: number;
  isRecording: boolean;
  recordingDuration: number;
  isPlayingRecording: boolean;
  backingTrackName: string | null;
  isBackingTrackPlaying: boolean;
  visualPreset: VisualPreset;
}

export { FREE_PLAY_VISUAL_MODE_OPTIONS };
export type { FreePlayVisualMode, FreePlayVisualNote, VisualPreset };

export function FreePlayVisualizer({
  mode,
  activeNotes,
  recentNotes,
  chordLabel,
  sustainOn,
  metronomeEnabled,
  metronomeBeat,
  isRecording,
  recordingDuration,
  isPlayingRecording,
  backingTrackName,
  isBackingTrackPlaying,
  visualPreset,
}: FreePlayVisualizerProps) {
  const modeMeta =
    FREE_PLAY_VISUAL_MODE_OPTIONS.find((option) => option.value === mode) ?? FREE_PLAY_VISUAL_MODE_OPTIONS[0];
  const statusLabel = isPlayingRecording
    ? 'Playback'
    : isRecording
      ? `Recording ${formatRecordingTimer(recordingDuration)}`
      : sustainOn
        ? 'Pedal down'
        : isBackingTrackPlaying
          ? 'Track rolling'
          : 'Live input';

  return (
    <section className={`free-play-visualizer free-play-visualizer-${mode}`} aria-label={`${modeMeta.label} visualizer`}>
      <div className="free-play-visualizer-info">
      <div className="free-play-visualizer-copy">
        <p className="eyebrow">Immersive Free Play</p>
        <h1>{modeMeta.label}</h1>
        <p className="panel-copy">{modeMeta.description}</p>
      </div>

      <div className="free-play-visualizer-badges">
        <span className="free-play-visualizer-badge">{statusLabel}</span>
        <span className="free-play-visualizer-badge">{chordLabel ?? 'Exploring harmony'}</span>
        <span className="free-play-visualizer-badge">
          {backingTrackName ? (isBackingTrackPlaying ? `Track: ${backingTrackName}` : `Track loaded: ${backingTrackName}`) : 'No backing track'}
        </span>
      </div>
      </div>

      <FreePlayCanvasScene
        mode={mode}
        activeNotes={activeNotes}
        recentNotes={recentNotes}
        sustainOn={sustainOn}
        metronomeEnabled={metronomeEnabled}
        metronomeBeat={metronomeBeat}
        visualPreset={visualPreset}
      />
    </section>
  );
}
