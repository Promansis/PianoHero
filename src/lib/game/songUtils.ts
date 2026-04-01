import type { ParsedNote, ParsedSong, ParsedTrack, ScheduledNote, TrackAssignment } from './types';

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
