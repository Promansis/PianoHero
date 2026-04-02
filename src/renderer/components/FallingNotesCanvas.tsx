import { useEffect, useRef, useState } from 'react';
import type { PlaybackSnapshot, VisibleNote } from '../../lib/game/types';

interface FallingNotesCanvasProps {
  snapshot: PlaybackSnapshot;
  onFileDrop: (file: File) => void;
  fingeringEditEnabled?: boolean;
  selectedNoteId?: string | null;
  onNoteSelect?: (note: VisibleNote, anchorPoint: { x: number; y: number }) => void;
}

function noteFill(note: VisibleNote): string {
  switch (note.judgement) {
    case 'perfect':
      return '#f5c542';
    case 'good':
      return '#40b56a';
    case 'ok':
      return '#4a90d9';
    case 'miss':
      return '#bf5b44';
    default:
      return note.hand === 'left' ? '#3366cc' : '#dc5b35';
  }
}

export function FallingNotesCanvas({
  snapshot,
  onFileDrop,
  fingeringEditEnabled = false,
  selectedNoteId = null,
  onNoteSelect,
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
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height, snapshot.hitLineRatio);
    drawNotes(context, width, height, snapshot.visibleNotes, selectedNoteId);
    drawHitLine(context, width, height, snapshot.hitLineRatio);
  }, [snapshot]);

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
): void {
  context.fillStyle = '#fdf9f1';
  context.fillRect(0, 0, width, height);

  context.strokeStyle = 'rgba(35, 33, 28, 0.08)';
  context.lineWidth = 1;
  for (let index = 0; index <= 11; index += 1) {
    const x = width * index / 11;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  context.strokeStyle = 'rgba(35, 33, 28, 0.1)';
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
): void {
  for (const note of notes) {
    const x = note.xRatio * width;
    const noteWidth = Math.max(width * note.widthRatio * 0.92, 12);
    const y = note.topRatio * height;
    const noteHeight = Math.max(note.heightRatio * height, 14);

    context.fillStyle = noteFill(note);
    context.fillRect(x + 2, y, noteWidth - 4, noteHeight);

    if (selectedNoteId === note.id) {
      context.strokeStyle = '#1f3d7a';
      context.lineWidth = 2;
      context.strokeRect(x + 1, y - 1, noteWidth - 2, noteHeight + 2);
    }

    context.fillStyle = 'rgba(255, 250, 244, 0.96)';
    context.font = '12px "Alegreya Sans", "Trebuchet MS", sans-serif';
    context.textAlign = 'center';
    context.fillText(note.label, x + noteWidth / 2, y + Math.min(18, noteHeight - 4));

    if (note.finger !== undefined) {
      context.font = 'bold 11px "Alegreya Sans", "Trebuchet MS", sans-serif';
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
): void {
  const y = height * hitLineRatio;
  context.strokeStyle = '#1f3d7a';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(width, y);
  context.stroke();
}
