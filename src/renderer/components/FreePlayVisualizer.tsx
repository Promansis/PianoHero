import type { CSSProperties, ReactNode } from 'react';

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
}

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midiToLane(midi: number): number {
  return clamp(((midi - 21) / 87) * 100, 4, 96);
}

function midiToHue(midi: number): number {
  return (midi * 17 + 40) % 360;
}

function midiToLabel(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

function pitchClassLabel(pitchClass: number): string {
  return NOTE_NAMES[((pitchClass % 12) + 12) % 12];
}

function formatRecordingTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function noteStyle(note: FreePlayVisualNote, index: number, total: number): CSSProperties {
  const orbitAngle = (360 / Math.max(total, 1)) * index;
  return {
    '--event-left': `${midiToLane(note.midi)}%`,
    '--event-hue': String(midiToHue(note.midi)),
    '--event-scale': `${0.72 + note.velocity * 0.85}`,
    '--event-delay': `${index * 50}ms`,
    '--event-angle': `${orbitAngle}deg`,
    '--event-radial': `${120 + note.velocity * 90}px`,
  } as CSSProperties;
}

function renderConcertStage(recentNotes: FreePlayVisualNote[], activeNotes: number[]): ReactNode {
  return (
    <>
      <div className="free-play-stage-lights" aria-hidden="true">
        <span className="free-play-stage-light light-left" />
        <span className="free-play-stage-light light-center" />
        <span className="free-play-stage-light light-right" />
      </div>
      <div className="free-play-stage-floor" aria-hidden="true" />
      <div className="free-play-stage-note-cloud" aria-hidden="true">
        {recentNotes.map((note, index) => (
          <span
            key={note.id}
            className="free-play-stage-burst"
            style={noteStyle(note, index, recentNotes.length)}
          >
            <span>{midiToLabel(note.midi)}</span>
          </span>
        ))}
      </div>
      <div className="free-play-active-pill-row">
        {activeNotes.slice(-6).map((note) => (
          <span key={`concert-active-${note}`} className="free-play-active-pill">
            {midiToLabel(note)}
          </span>
        ))}
      </div>
    </>
  );
}

function renderClassicPiano(recentNotes: FreePlayVisualNote[], activeNotes: number[], sustainOn: boolean): ReactNode {
  return (
    <div className="free-play-classic-shell" aria-hidden="true">
      <div className="free-play-classic-lid" />
      <div className="free-play-classic-body" />
      <div className="free-play-classic-reflection" />
      <div className={`free-play-classic-pedal ${sustainOn ? 'engaged' : ''}`} />
      <div className="free-play-classic-notes">
        {recentNotes.slice(-8).map((note, index) => (
          <span
            key={note.id}
            className="free-play-classic-note"
            style={noteStyle(note, index, recentNotes.length)}
          >
            {midiToLabel(note.midi)}
          </span>
        ))}
      </div>
      <div className="free-play-active-pill-row">
        {activeNotes.slice(-6).map((note) => (
          <span key={`classic-active-${note}`} className="free-play-active-pill">
            {midiToLabel(note)}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderColorRibbons(recentNotes: FreePlayVisualNote[]): ReactNode {
  return (
    <div className="free-play-ribbon-field" aria-hidden="true">
      {recentNotes.map((note, index) => (
        <span
          key={note.id}
          className="free-play-ribbon"
          style={noteStyle(note, index, recentNotes.length)}
        />
      ))}
    </div>
  );
}

function renderPulseOrbit(recentNotes: FreePlayVisualNote[], activeNotes: number[]): ReactNode {
  return (
    <div className="free-play-orbit-shell" aria-hidden="true">
      <span className="free-play-orbit-ring ring-a" />
      <span className="free-play-orbit-ring ring-b" />
      <span className="free-play-orbit-ring ring-c" />
      <span className="free-play-orbit-core" />
      {recentNotes.map((note, index) => (
        <span
          key={note.id}
          className="free-play-orbit-pulse"
          style={noteStyle(note, index, recentNotes.length)}
        />
      ))}
      {activeNotes.map((note, index) => (
        <span
          key={`orbit-node-${note}`}
          className="free-play-orbit-node"
          style={{
            '--event-angle': `${(360 / Math.max(activeNotes.length, 1)) * index}deg`,
            '--event-hue': String(midiToHue(note)),
            '--event-radial': `${110 + (note % 12) * 14}px`,
          } as CSSProperties}
        >
          {pitchClassLabel(note % 12)}
        </span>
      ))}
    </div>
  );
}

function renderConstellation(recentNotes: FreePlayVisualNote[]): ReactNode {
  const visibleNotes = recentNotes.slice(-8);
  const points = visibleNotes.map((note, index) => ({
    note,
    x: clamp(12 + midiToLane(note.midi) * 0.76, 12, 88),
    y: 24 + (index % 4) * 14 + ((note.midi + index) % 3) * 5,
  }));

  return (
    <div className="free-play-constellation-shell" aria-hidden="true">
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const width = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <span
            key={`constellation-line-${point.note.id}`}
            className="free-play-constellation-line"
            style={{
              left: `${previous.x}%`,
              top: `${previous.y}%`,
              width: `${width}%`,
              transform: `rotate(${angle}deg)`,
              '--event-hue': String(midiToHue(point.note.midi)),
            } as CSSProperties}
          />
        );
      })}
      {points.map(({ note, x, y }, index) => (
        <span
          key={note.id}
          className="free-play-constellation-star"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            '--event-hue': String(midiToHue(note.midi)),
            '--event-scale': `${0.78 + note.velocity * 0.7}`,
            '--event-delay': `${index * 70}ms`,
          } as CSSProperties}
        >
          <span>{pitchClassLabel(note.midi % 12)}</span>
        </span>
      ))}
    </div>
  );
}

function renderScaleHeatmap(recentNotes: FreePlayVisualNote[], activeNotes: number[]): ReactNode {
  const counts = Array.from({ length: 12 }, (_, pitchClass) =>
    recentNotes.filter((note) => note.midi % 12 === pitchClass).length,
  );
  const maxCount = Math.max(1, ...counts);
  const activePitchClasses = new Set(activeNotes.map((note) => note % 12));

  return (
    <div className="free-play-heatmap-shell" aria-hidden="true">
      <div className="free-play-heatmap-grid">
        {counts.map((count, pitchClass) => (
          <div
            key={`heatmap-${pitchClass}`}
            className={`free-play-heatmap-cell ${activePitchClasses.has(pitchClass) ? 'active' : ''}`}
            style={{
              '--heat-strength': `${count / maxCount}`,
              '--event-hue': String(midiToHue(pitchClass + 60)),
            } as CSSProperties}
          >
            <span>{pitchClassLabel(pitchClass)}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="free-play-heatmap-caption">
        <span>Low register</span>
        <span>Mid register</span>
        <span>High register</span>
      </div>
    </div>
  );
}

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

      <div className="free-play-visualizer-scene">
        {mode === 'concert-stage' && renderConcertStage(recentNotes, activeNotes)}
        {mode === 'classic-piano' && renderClassicPiano(recentNotes, activeNotes, sustainOn)}
        {mode === 'color-ribbons' && renderColorRibbons(recentNotes)}
        {mode === 'pulse-orbit' && renderPulseOrbit(recentNotes, activeNotes)}
        {mode === 'constellation' && renderConstellation(recentNotes)}
        {mode === 'scale-heatmap' && renderScaleHeatmap(recentNotes, activeNotes)}
      </div>

      {metronomeEnabled && (
        <span key={`metronome-${metronomeBeat}`} className="free-play-metronome-pulse" aria-hidden="true" />
      )}
    </section>
  );
}
