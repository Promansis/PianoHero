import type { VisibleNote } from '../../lib/game/types';

interface FingeringEditorProps {
  note: VisibleNote;
  anchorPoint: { x: number; y: number };
  onSelectFinger: (finger: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function FingeringEditor({ note, anchorPoint, onSelectFinger, onReset, onClose }: FingeringEditorProps) {
  return (
    <div
      className="fingering-editor-popup"
      style={{
        left: `${anchorPoint.x}px`,
        top: `${anchorPoint.y}px`,
      }}
    >
      <div className="fingering-editor-header">
        <div>
          <p className="eyebrow">Edit Fingering</p>
          <h2>{note.label}</h2>
          <p className="panel-copy">
            {note.hand} hand · current {note.finger ?? 'auto'}
          </p>
        </div>
        <button className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="fingering-editor-buttons">
        {[1, 2, 3, 4, 5].map((finger) => (
          <button
            key={finger}
            className={note.finger === finger ? 'primary-button' : 'secondary-button'}
            onClick={() => onSelectFinger(finger)}
          >
            {finger}
          </button>
        ))}
      </div>

      <button className="secondary-button" onClick={onReset}>
        Reset to Auto
      </button>
    </div>
  );
}
