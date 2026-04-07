import type { Hand, ParsedNote, ParsedSong, ParsedTrack } from '../game/types';
import type { DrillSpec } from './types';

const PPQ = 480;

interface NoteSeed {
  midi: number;
  hand: Hand;
  startSec: number;
  durationSec: number;
}

function midiToLabel(midi: number): string {
  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${pitchNames[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function makeTrack(id: string, name: string, hand: Hand): ParsedTrack {
  return {
    id,
    name,
    sourceTrackIndex: hand === 'left' ? 0 : 1,
    defaultAssignment: hand,
    assignment: hand,
  };
}

function normalizeNotes(title: string, bpm: number, noteSeeds: NoteSeed[]): ParsedSong {
  const tracks: ParsedTrack[] = [];
  if (noteSeeds.some((note) => note.hand === 'left')) {
    tracks.push(makeTrack('left-track', 'Left Hand', 'left'));
  }
  if (noteSeeds.some((note) => note.hand === 'right')) {
    tracks.push(makeTrack('right-track', 'Right Hand', 'right'));
  }

  const notes = noteSeeds
    .slice()
    .sort((left, right) => left.startSec - right.startSec || left.midi - right.midi)
    .map<ParsedNote>((note, index) => ({
      id: `learning-note-${index}`,
      trackId: note.hand === 'left' ? 'left-track' : 'right-track',
      midi: note.midi,
      name: midiToLabel(note.midi),
      velocity: 0.85,
      startSec: note.startSec,
      durationSec: note.durationSec,
      hand: note.hand,
    }));

  const durationSec = notes.length === 0
    ? 0
    : Math.max(...notes.map((note) => note.startSec + note.durationSec));

  return {
    id: `learning-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title,
    ppq: PPQ,
    bpm,
    durationSec,
    tracks,
    notes,
  };
}

function makeTimedSequence(
  events: Array<{ midi: number; hand: Hand; beats?: number; startBeat?: number }>,
  bpm: number,
  defaultBeats = 1,
): NoteSeed[] {
  const secondsPerBeat = 60 / Math.max(40, bpm);
  let cursorBeat = 0;

  return events.map((event) => {
    const beats = event.beats ?? defaultBeats;
    const startBeat = event.startBeat ?? cursorBeat;
    const note: NoteSeed = {
      midi: event.midi,
      hand: event.hand,
      startSec: startBeat * secondsPerBeat,
      durationSec: Math.max(0.18, beats * secondsPerBeat * 0.82),
    };
    if (event.startBeat === undefined) {
      cursorBeat += beats;
    }
    return note;
  });
}

function buildFiveFingerSequence(spec: Extract<DrillSpec, { kind: 'five-finger-pattern' }>): NoteSeed[] {
  const noteBeats = spec.noteBeats ?? 1;
  const repetitions = Math.max(1, spec.repetitions ?? 1);
  const whiteKeyOffsets = [0, 2, 4, 5, 7];
  const rightPattern = whiteKeyOffsets.map((offset) => spec.startMidi + offset);
  const leftPattern = whiteKeyOffsets.map((offset) =>
    spec.handMode === 'parallel' || spec.handMode === 'contrary'
      ? spec.startMidi - 12 + offset
      : spec.startMidi + offset,
  );

  const shape = spec.direction === 'ascending'
    ? [0, 1, 2, 3, 4]
    : spec.direction === 'descending'
      ? [4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 3, 2, 1, 0];

  const events: Array<{ midi: number; hand: Hand; beats?: number; startBeat?: number }> = [];
  let beatCursor = 0;

  const pushPair = (leftMidi: number, rightMidi: number) => {
    events.push({ midi: leftMidi, hand: 'left', beats: noteBeats, startBeat: beatCursor });
    events.push({ midi: rightMidi, hand: 'right', beats: noteBeats, startBeat: beatCursor });
    beatCursor += noteBeats;
  };

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    for (const index of shape) {
      if (spec.handMode === 'right') {
        events.push({ midi: rightPattern[index], hand: 'right', beats: noteBeats });
        beatCursor += noteBeats;
        continue;
      }
      if (spec.handMode === 'left') {
        events.push({ midi: leftPattern[index], hand: 'left', beats: noteBeats });
        beatCursor += noteBeats;
        continue;
      }
      if (spec.handMode === 'parallel') {
        pushPair(leftPattern[index], rightPattern[index]);
        continue;
      }
      pushPair(leftPattern[4 - index], rightPattern[index]);
    }
  }

  return makeTimedSequence(events, spec.bpm, noteBeats);
}

function buildIntervalJumpSequence(spec: Extract<DrillSpec, { kind: 'interval-jumps' }>): NoteSeed[] {
  const noteBeats = spec.noteBeats ?? 1;
  const events: Array<{ midi: number; hand: Hand; beats?: number }> = [];

  spec.intervals.forEach((interval, index) => {
    const hand = spec.handMode === 'alternating'
      ? index % 2 === 0 ? 'right' : 'left'
      : spec.handMode;
    events.push({ midi: spec.baseMidi, hand, beats: noteBeats });
    events.push({ midi: spec.baseMidi + interval, hand, beats: noteBeats });
  });

  return makeTimedSequence(events, spec.bpm, noteBeats);
}

function buildMotionPatternSequence(spec: Extract<DrillSpec, { kind: 'motion-pattern' }>): NoteSeed[] {
  const noteBeats = spec.noteBeats ?? 1;
  const repetitions = Math.max(1, spec.repetitions ?? 1);
  const events: Array<{ midi: number; hand: Hand; beats?: number; startBeat?: number }> = [];
  let beatCursor = 0;

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    for (const interval of spec.intervals) {
      const rightMidi = spec.startMidi + interval;
      const leftMidi = spec.handMode === 'parallel'
        ? spec.startMidi - 12 + interval
        : spec.startMidi - interval;
      events.push({ midi: leftMidi, hand: 'left', beats: noteBeats, startBeat: beatCursor });
      events.push({ midi: rightMidi, hand: 'right', beats: noteBeats, startBeat: beatCursor });
      beatCursor += noteBeats;
    }
  }

  return makeTimedSequence(events, spec.bpm, noteBeats);
}

function buildArpeggioSequence(spec: Extract<DrillSpec, { kind: 'arpeggio' }>): NoteSeed[] {
  const noteBeats = spec.noteBeats ?? 0.5;
  const pattern = spec.quality === 'major'
    ? [0, 4, 7, 12]
    : spec.quality === 'minor'
      ? [0, 3, 7, 12]
      : [0, 4, 7, 10, 12];

  const ascending: number[] = [];
  for (let octave = 0; octave < Math.max(1, spec.octaves); octave += 1) {
    for (const interval of pattern.slice(0, -1)) {
      ascending.push(spec.rootMidi + octave * 12 + interval);
    }
  }
  ascending.push(spec.rootMidi + Math.max(1, spec.octaves) * 12);

  const contour = spec.direction === 'ascending'
    ? ascending
    : spec.direction === 'descending'
      ? [...ascending].reverse()
      : [...ascending, ...ascending.slice(0, -1).reverse()];

  const events: Array<{ midi: number; hand: Hand; beats?: number; startBeat?: number }> = [];
  let beatCursor = 0;

  const pushForHand = (midi: number, hand: Hand) => {
    events.push({ midi, hand, beats: noteBeats });
    beatCursor += noteBeats;
  };

  for (const midi of contour) {
    if (spec.hands === 'right') {
      pushForHand(midi, 'right');
      continue;
    }
    if (spec.hands === 'left') {
      pushForHand(midi - 12, 'left');
      continue;
    }

    events.push({ midi: midi - 12, hand: 'left', beats: noteBeats, startBeat: beatCursor });
    events.push({ midi, hand: 'right', beats: noteBeats, startBeat: beatCursor });
    beatCursor += noteBeats;
  }

  return makeTimedSequence(events, spec.bpm, noteBeats);
}

export function buildLessonDrill(title: string, spec: DrillSpec): ParsedSong {
  let notes: NoteSeed[];

  switch (spec.kind) {
    case 'single-note-rhythm':
      notes = makeTimedSequence(
        Array.from({ length: Math.max(1, spec.repetitions ?? 1) })
          .flatMap(() => spec.patternBeats.map((beats) => ({
            midi: spec.midi,
            hand: spec.hand,
            beats,
          }))),
        spec.bpm,
      );
      break;
    case 'five-finger-pattern':
      notes = buildFiveFingerSequence(spec);
      break;
    case 'melody':
      notes = makeTimedSequence(
        spec.notes.map((note) => ({
          midi: note.midi,
          hand: note.hand,
          beats: note.beats,
        })),
        spec.bpm,
      );
      break;
    case 'interval-jumps':
      notes = buildIntervalJumpSequence(spec);
      break;
    case 'motion-pattern':
      notes = buildMotionPatternSequence(spec);
      break;
    case 'arpeggio':
      notes = buildArpeggioSequence(spec);
      break;
  }

  return normalizeNotes(title, spec.bpm, notes);
}
