import { Midi } from '@tonejs/midi';
import { defaultAssignmentForNotes, defaultHandForMidi, noteNumberToName } from '../game/songUtils';
import type { ParsedNote, ParsedSong, ParsedTrack } from '../game/types';

export interface MidiSourceMeta {
  songId: string;
  title: string;
}

export function parseMidiFile(arrayBuffer: ArrayBuffer, meta: MidiSourceMeta): ParsedSong {
  const midi = new Midi(arrayBuffer);
  const bpm = midi.header.tempos[0]?.bpm ?? 120;

  const tracks: ParsedTrack[] = midi.tracks.map((track, index) => {
    const trackId = `track-${index}`;
    return {
      id: trackId,
      name: track.name?.trim() || `Track ${index + 1}`,
      sourceTrackIndex: index,
      defaultAssignment: defaultAssignmentForNotes(track.notes),
      assignment: defaultAssignmentForNotes(track.notes),
    };
  });

  const notes: ParsedNote[] = midi.tracks.flatMap((track, trackIndex) =>
    track.notes.map((note, noteIndex) => ({
      id: `track-${trackIndex}-note-${noteIndex}`,
      trackId: `track-${trackIndex}`,
      midi: note.midi,
      name: note.name || noteNumberToName(note.midi),
      velocity: note.velocity,
      startSec: note.time,
      durationSec: note.duration,
      hand: defaultHandForMidi(note.midi),
    })),
  );

  return {
    id: meta.songId,
    title: meta.title,
    ppq: midi.header.ppq,
    bpm,
    durationSec: midi.duration,
    tracks,
    notes: notes.sort((left, right) => left.startSec - right.startSec || left.midi - right.midi),
  };
}
