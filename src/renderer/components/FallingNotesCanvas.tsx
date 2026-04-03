import { useEffect, useRef, useState } from 'react';
import type { PlaybackSnapshot, VisibleNote } from '../../lib/game/types';
import { getKeyPosition, OCTAVE_C_MIDI } from '../../lib/piano/pianoLayout';

interface FallingNotesCanvasProps {
  snapshot: PlaybackSnapshot;
  onFileDrop: (file: File) => void;
  fingeringEditEnabled?: boolean;
  selectedNoteId?: string | null;
  onNoteSelect?: (note: VisibleNote, anchorPoint: { x: number; y: number }) => void;
  colorBlindMode?: boolean;
  noteLabels?: 'alphabetic' | 'symbols' | 'both' | 'none';
}

interface CanvasPalette {
  perfect: string;
  good: string;
  ok: string;
  miss: string;
  leftHand: string;
  rightHand: string;
  surface: string;
  grid: string;
  hitLine: string;
  text: string;
  selected: string;
}

function readCanvasPalette(): CanvasPalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    perfect: styles.getPropertyValue('--color-perfect').trim() || '#f5c542',
    good: styles.getPropertyValue('--color-good').trim() || '#40b56a',
    ok: styles.getPropertyValue('--color-ok').trim() || '#4a90d9',
    miss: styles.getPropertyValue('--color-miss').trim() || '#bf5b44',
    leftHand: styles.getPropertyValue('--color-accent').trim() || '#3366cc',
    rightHand: styles.getPropertyValue('--color-accent-secondary').trim() || '#dc5b35',
    surface: styles.getPropertyValue('--color-chart-bg').trim() || '#fdf9f1',
    grid: styles.getPropertyValue('--color-chart-grid').trim() || 'rgba(35, 33, 28, 0.08)',
    hitLine: styles.getPropertyValue('--color-accent').trim() || '#1f3d7a',
    text: styles.getPropertyValue('--color-note-text').trim() || 'rgba(255, 250, 244, 0.96)',
    selected: styles.getPropertyValue('--color-accent').trim() || '#1f3d7a',
  };
}

function noteFill(note: VisibleNote, colorBlindMode: boolean, palette: CanvasPalette): string {
  if (colorBlindMode) {
    // Deuteranopia-safe palette: yellow/blue/cyan/pink instead of yellow/green/blue/red
    switch (note.judgement) {
      case 'perfect': return palette.perfect;
      case 'good': return '#4477AA';
      case 'ok': return '#66CCEE';
      case 'miss': return '#EE6677';
      default: return note.hand === 'left' ? '#4477AA' : '#EE6677';
    }
  }
  switch (note.judgement) {
    case 'perfect':
      return palette.perfect;
    case 'good':
      return palette.good;
    case 'ok':
      return palette.ok;
    case 'miss':
      return palette.miss;
    default:
      return note.hand === 'left' ? palette.leftHand : palette.rightHand;
  }
}

export function FallingNotesCanvas({
  snapshot,
  onFileDrop,
  fingeringEditEnabled = false,
  selectedNoteId = null,
  onNoteSelect,
  colorBlindMode = false,
  noteLabels = 'alphabetic',
}: FallingNotesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDropping, setIsDropping] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const palette = readCanvasPalette();
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, snapshot.hitLineRatio, palette);
    drawNotes(context, width, height, snapshot.visibleNotes, selectedNoteId, colorBlindMode, noteLabels, palette);
    drawHitLine(context, width, height, snapshot.hitLineRatio, palette);
  }, [colorBlindMode, noteLabels, selectedNoteId, snapshot]);

  return (
    <div
      className={`canvas-shell panel ${isDropping ? 'dropping' : ''}`}
      ref={containerRef}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDropping(true);
      }}
      onDragLeave={() => setIsDropping(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDropping(false);
        const file = event.dataTransfer.files[0];
        if (file) {
          onFileDrop(file);
        }
      }}
      onClick={(event) => {
        if (!fingeringEditEnabled || !onNoteSelect || !containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const localPoint = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        const hit = hitTestVisibleNote(localPoint, rect.width, rect.height, snapshot.visibleNotes);
        if (hit) {
          onNoteSelect(hit, localPoint);
        }
      }}
    >
      <div className="canvas-labels">
        <div>
          <p className="eyebrow">Falling Notes</p>
          <h2>Play at the hit line</h2>
        </div>
        <p className="panel-copy">Drag and drop a MIDI file here or use the import button.</p>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hitLineRatio: number,
  palette: CanvasPalette,
): void {
  context.fillStyle = palette.surface;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  // Draw vertical lines at octave boundaries (each C note)
  for (const midi of OCTAVE_C_MIDI) {
    const x = getKeyPosition(midi).leftPercent / 100 * width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let index = 1; index <= 4; index += 1) {
    const y = height * hitLineRatio * index / 4;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawNotes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  notes: VisibleNote[],
  selectedNoteId: string | null,
  colorBlindMode: boolean,
  noteLabels: 'alphabetic' | 'symbols' | 'both' | 'none',
  palette: CanvasPalette,
): void {
  for (const note of notes) {
    const x = note.xRatio * width;
    const noteWidth = Math.max(width * note.widthRatio * 0.92, 12);
    const y = note.topRatio * height;
    const noteHeight = Math.max(note.heightRatio * height, 14);

    context.fillStyle = noteFill(note, colorBlindMode, palette);
    context.fillRect(x + 2, y, noteWidth - 4, noteHeight);

    if (selectedNoteId === note.id) {
      context.strokeStyle = palette.selected;
      context.lineWidth = 2;
      context.strokeRect(x + 1, y - 1, noteWidth - 2, noteHeight + 2);
    }

    if (noteLabels !== 'none') {
      context.fillStyle = palette.text;
      context.font = '12px "Segoe UI", system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(note.label, x + noteWidth / 2, y + Math.min(18, noteHeight - 4));
    }

    if (note.finger !== undefined) {
      context.fillStyle = palette.text;
      context.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(String(note.finger), x + noteWidth / 2, y + Math.min(32, noteHeight - 4));
    }
  }
}

function hitTestVisibleNote(
  point: { x: number; y: number },
  width: number,
  height: number,
  notes: VisibleNote[],
): VisibleNote | null {
  const matches = notes.filter((note) => {
    const x = note.xRatio * width;
    const noteWidth = Math.max(width * note.widthRatio * 0.92, 12);
    const y = note.topRatio * height;
    const noteHeight = Math.max(note.heightRatio * height, 14);

    return point.x >= x && point.x <= x + noteWidth && point.y >= y && point.y <= y + noteHeight;
  });

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((left, right) => {
    const leftArea = left.widthRatio * left.heightRatio;
    const rightArea = right.widthRatio * right.heightRatio;
    if (leftArea !== rightArea) {
      return leftArea - rightArea;
    }
    return left.topRatio - right.topRatio;
  })[0];
}

function drawHitLine(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hitLineRatio: number,
  palette: CanvasPalette,
): void {
  const y = height * hitLineRatio;
  context.strokeStyle = palette.hitLine;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(width, y);
  context.stroke();
}
