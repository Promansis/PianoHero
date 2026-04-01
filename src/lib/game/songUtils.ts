import type {
  HandFilter,
  LoopRange,
  ParsedNote,
  ParsedSong,
  ParsedTrack,
  ScheduledNote,
  TrackAssignment,
} from './types';

const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNumberToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${MIDI_NOTE_NAMES[midi % 12]}${octave}`;
}

export function defaultHandForMidi(midi: number): 'left' | 'right' {
  return midi < 60 ? 'left' : 'right';
}

export function defaultAssignmentForNotes(notes: Array<{ midi: number }>): TrackAssignment {
  if (notes.length === 0) {
    return 'both';
  }

  const allLeft = notes.every((note) => note.midi < 60);
  if (allLeft) {
    return 'left';
  }

  const allRight = notes.every((note) => note.midi >= 60);
  if (allRight) {
    return 'right';
  }

  return 'both';
}

export function getEffectiveHand(note: ParsedNote, assignment: TrackAssignment): 'left' | 'right' | null {
  if (assignment === 'ignore') {
    return null;
  }

  if (assignment === 'left' || assignment === 'right') {
    return assignment;
  }

  return defaultHandForMidi(note.midi);
}

export function buildScheduledNotes(song: ParsedSong): ScheduledNote[] {
  const trackMap = new Map(song.tracks.map((track) => [track.id, track]));

  return song.notes
    .map((note) => {
      const track = trackMap.get(note.trackId);
      const effectiveHand = track ? getEffectiveHand(note, track.assignment) : note.hand;
      if (!effectiveHand) {
        return null;
      }

      return {
        ...note,
        effectiveHand,
      };
    })
    .filter((note): note is ScheduledNote => note !== null)
    .sort((left, right) => {
      if (left.startSec !== right.startSec) {
        return left.startSec - right.startSec;
      }

      return left.midi - right.midi;
    });
}

export function applyTrackAssignments(
  song: ParsedSong,
  assignments: Record<string, TrackAssignment>,
): ParsedSong {
  return {
    ...song,
    tracks: song.tracks.map((track) => ({
      ...track,
      assignment: assignments[track.id] ?? track.assignment,
    })),
  };
}

export function getTrackAssignments(song: ParsedSong): Record<string, TrackAssignment> {
  return Object.fromEntries(song.tracks.map((track) => [track.id, track.assignment]));
}

export function setTrackAssignment(
  song: ParsedSong,
  trackId: string,
  assignment: TrackAssignment,
): ParsedSong {
  return {
    ...song,
    tracks: song.tracks.map((track) =>
      track.id === trackId
        ? {
            ...track,
            assignment,
          }
        : track,
    ),
  };
}

export function cloneTracksWithAssignments(
  tracks: ParsedTrack[],
  assignments: Record<string, TrackAssignment>,
): ParsedTrack[] {
  return tracks.map((track) => ({
    ...track,
    assignment: assignments[track.id] ?? track.assignment,
  }));
}

export function filterSongByHand(song: ParsedSong, handFilter: HandFilter): ParsedSong {
  if (handFilter === 'both') {
    return song;
  }

  const filteredNotes = buildScheduledNotes(song)
    .filter((note) => note.effectiveHand === handFilter)
    .map(({ effectiveHand: _effectiveHand, ...note }) => note);

  return {
    ...song,
    notes: filteredNotes,
  };
}

export function getMeasureIndexForTime(song: ParsedSong, startSec: number): number {
  const secPerBeat = 60 / Math.max(song.bpm, 1);
  const secPerMeasure = secPerBeat * 4;
  return Math.floor(startSec / secPerMeasure);
}

export function getMeasureCount(song: ParsedSong): number {
  if (song.durationSec <= 0) {
    return 1;
  }

  return getMeasureIndexForTime(song, song.durationSec) + 1;
}

export function getLoopRangeSeconds(song: ParsedSong, loopRange: LoopRange | null): {
  startSec: number;
  endSec: number;
} {
  if (!loopRange) {
    return { startSec: 0, endSec: song.durationSec };
  }

  const secPerBeat = 60 / Math.max(song.bpm, 1);
  const secPerMeasure = secPerBeat * 4;
  const measureCount = Math.max(getMeasureCount(song), 1);
  const startMeasure = Math.max(0, Math.min(loopRange.startMeasure, measureCount - 1));
  const endMeasure = Math.max(startMeasure, Math.min(loopRange.endMeasure, measureCount - 1));

  return {
    startSec: startMeasure * secPerMeasure,
    endSec: Math.min(song.durationSec, (endMeasure + 1) * secPerMeasure),
  };
}
