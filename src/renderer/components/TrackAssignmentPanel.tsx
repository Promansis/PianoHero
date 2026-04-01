import type { ParsedTrack, TrackAssignment } from '../../lib/game/types';

interface TrackAssignmentPanelProps {
  tracks: ParsedTrack[];
  onAssignmentChange: (trackId: string, assignment: TrackAssignment) => void;
}

const ASSIGNMENT_OPTIONS: TrackAssignment[] = ['left', 'right', 'both', 'ignore'];

function formatAssignment(assignment: TrackAssignment): string {
  switch (assignment) {
    case 'left':
      return 'Left Hand';
    case 'right':
      return 'Right Hand';
    case 'both':
      return 'Both Hands';
    case 'ignore':
      return 'Ignore';
  }
}

export function TrackAssignmentPanel({ tracks, onAssignmentChange }: TrackAssignmentPanelProps) {
  return (
    <aside className="track-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Track Map</p>
          <h2>Hand Assignment</h2>
        </div>
        <p className="panel-copy">Defaults are pitch-based. Adjust each track before playback.</p>
      </div>

      {tracks.length === 0 ? (
        <p className="empty-state">Import a MIDI file to assign left and right hand tracks.</p>
      ) : (
        <div className="track-list">
          {tracks.map((track) => (
            <label className="track-row" key={track.id}>
              <div>
                <strong>{track.name}</strong>
                <span>Default: {formatAssignment(track.defaultAssignment)}</span>
              </div>
              <select
                value={track.assignment}
                onChange={(event) => onAssignmentChange(track.id, event.target.value as TrackAssignment)}
              >
                {ASSIGNMENT_OPTIONS.map((assignment) => (
                  <option key={assignment} value={assignment}>
                    {formatAssignment(assignment)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </aside>
  );
}
