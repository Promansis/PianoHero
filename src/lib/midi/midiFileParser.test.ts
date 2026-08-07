import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { parseMidiFile } from './midiFileParser';

describe('parseMidiFile', () => {
  it('extracts bpm, tracks, and note metadata', () => {
    const midi = new Midi();
    midi.header.setTempo(96);
    const leftTrack = midi.addTrack();
    leftTrack.name = 'Left Hand';
    leftTrack.addNote({
      midi: 48,
      time: 0,
      duration: 0.5,
      velocity: 0.7,
    });

    const rightTrack = midi.addTrack();
    rightTrack.name = 'Right Hand';
    rightTrack.addNote({
      midi: 72,
      time: 1,
      duration: 0.25,
      velocity: 0.8,
    });

    const midiBytes = midi.toArray();
    const parsed = parseMidiFile(midiBytes.slice().buffer, {
      songId: 'song-1',
      title: 'Etude',
    });

    expect(parsed.bpm).toBe(96);
    expect(parsed.tracks).toHaveLength(2);
    expect(parsed.tracks[0].assignment).toBe('left');
    expect(parsed.tracks[1].assignment).toBe('right');
    expect(parsed.notes[0]).toMatchObject({
      midi: 48,
      name: 'C3',
      hand: 'left',
    });
    expect(parsed.notes[1]).toMatchObject({
      midi: 72,
      name: 'C5',
      hand: 'right',
    });
  });

  it('preserves MIDI meter and does not create a terminal phantom measure', () => {
    const midi = new Midi();
    midi.header.timeSignatures = [{ ticks: 0, timeSignature: [3, 4] }];
    midi.header.setTempo(120);
    const track = midi.addTrack();
    track.addNote({ midi: 60, ticks: 1440, durationTicks: 240, velocity: 0.8 });

    const parsed = parseMidiFile(midi.toArray().slice().buffer, { songId: 'metered', title: 'Metered' });

    expect(parsed.measureBoundaries).toHaveLength(2);
    expect(parsed.measureBoundaries?.[1]).toMatchObject({ startTick: 1440 });
  });
});
