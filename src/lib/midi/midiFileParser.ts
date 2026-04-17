import * as MidiPackage from '@tonejs/midi';
import { defaultAssignmentForNotes, defaultHandForMidi, noteNumberToName } from '../game/songUtils';
import type { ParsedNote, ParsedSong, ParsedTrack } from '../game/types';

interface MidiTrackNote {
  midi: number;
  name?: string;
  velocity: number;
  time: number;
  duration: number;
}

interface MidiTrack {
  name?: string;
  notes: MidiTrackNote[];
}

interface MetaEvent {
  text: string;
  type: string;
  ticks: number;
}

interface MidiInstance {
  header: {
    ppq: number;
    tempos: Array<{ bpm: number }>;
    name?: string;
    meta?: MetaEvent[];
  };
  tracks: MidiTrack[];
  duration: number;
}

type MidiConstructor = new (arrayBuffer: ArrayBuffer) => MidiInstance;

function resolveMidiConstructor(): MidiConstructor {
  const moduleValue = MidiPackage as {
    Midi?: MidiConstructor;
    default?: { Midi?: MidiConstructor };
  };

  const constructor = moduleValue.Midi ?? moduleValue.default?.Midi;
  if (!constructor) {
    throw new Error('Unable to resolve Midi constructor from @tonejs/midi.');
  }

  return constructor;
}

const MidiCtor = resolveMidiConstructor();

export interface MidiSourceMeta {
  songId: string;
  title: string;
}

export interface MidiFileMeta {
  suggestedTitle?: string;
  suggestedArtist?: string;
}

export function extractMidiMeta(arrayBuffer: ArrayBuffer): MidiFileMeta {
  const midi = new MidiCtor(arrayBuffer);
  const result: MidiFileMeta = {};

  const rawName = midi.header.name?.trim();
  if (rawName) result.suggestedTitle = rawName;

  for (const event of midi.header.meta ?? []) {
    const text = event.text?.trim();
    if (!text) continue;
    if (event.type === 'copyright' && !result.suggestedArtist) {
      result.suggestedArtist = text;
    } else if ((event.type === 'trackName' || event.type === 'text') && !result.suggestedTitle) {
      result.suggestedTitle = text;
    }
  }

  return result;
}

export function parseMidiFile(arrayBuffer: ArrayBuffer, meta: MidiSourceMeta): ParsedSong {
  const midi = new MidiCtor(arrayBuffer);
  const bpm = midi.header.tempos[0]?.bpm ?? 120;

  const tracks: ParsedTrack[] = midi.tracks.map((track: MidiTrack, index: number) => {
    const trackId = `track-${index}`;
    const trackName = track.name?.trim() || `Track ${index + 1}`;
    const assignment = defaultAssignmentForNotes(track.notes, trackName);
    return {
      id: trackId,
      name: trackName,
      sourceTrackIndex: index,
      defaultAssignment: assignment,
      assignment,
    };
  });

  const notes: ParsedNote[] = midi.tracks.flatMap((track: MidiTrack, trackIndex: number) =>
    track.notes.map((note: MidiTrackNote, noteIndex: number) => ({
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
