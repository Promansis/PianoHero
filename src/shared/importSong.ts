import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedSong } from '../lib/game/types';
import { getTrackAssignments } from '../lib/game/songUtils';
import { extractMidiMeta, parseMidiFile } from '../lib/midi/midiFileParser';
import type { AppDatabase } from '../main/database';
import type { ImportedSong } from './ipc';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function createSongId(buffer: Uint8Array): Promise<string> {
  return createHash('sha256').update(buffer).digest('hex');
}

export function calculateDifficulty(song: ParsedSong): number {
  const { notes, durationSec, bpm } = song;
  if (notes.length === 0) return 1;

  const safeDuration = Math.max(durationSec, 1);

  // Note density: notes per second (normalized to a reasonable scale)
  const density = notes.length / safeDuration;
  const densityScore = Math.min(10, density * 1.4);

  // Pitch range: wider span = harder
  const midiValues = notes.map((n) => n.midi);
  const pitchRange = Math.max(...midiValues) - Math.min(...midiValues);
  const rangeScore = Math.min(10, pitchRange / 8);

  // Chord density: max simultaneous notes within a 50ms window
  let maxSimultaneous = 1;
  for (let i = 0; i < notes.length; i++) {
    const start = notes[i].startSec;
    let count = 1;
    for (let j = i + 1; j < notes.length && notes[j].startSec - start < 0.05; j++) {
      count++;
    }
    if (count > maxSimultaneous) maxSimultaneous = count;
  }
  const chordScore = Math.min(10, (maxSimultaneous - 1) * 2.5);

  // Tempo: faster tempos demand faster reactions
  const tempoScore = Math.min(10, bpm / 30);

  // Weighted combination
  const raw = densityScore * 0.40 + rangeScore * 0.25 + chordScore * 0.20 + tempoScore * 0.15;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

interface ImportSongOptions {
  db: AppDatabase;
  midiFilesDir: string;
}

export async function importSongFromBuffer(
  buffer: Uint8Array,
  title: string,
  { db, midiFilesDir }: ImportSongOptions,
): Promise<ImportedSong> {
  const fileData = Uint8Array.from(buffer);
  const songId = await createSongId(fileData);
  const destPath = join(midiFilesDir, `${songId}.mid`);
  const midiMeta = extractMidiMeta(toArrayBuffer(fileData));
  const effectiveTitle = midiMeta.suggestedTitle || title;
  const parsedSong = parseMidiFile(toArrayBuffer(fileData), { songId, title: effectiveTitle });
  const difficulty = calculateDifficulty(parsedSong);

  await writeFile(destPath, fileData);

  const row = db.addSong({
    id: songId,
    title: effectiveTitle,
    artist: midiMeta.suggestedArtist ?? '',
    genre: '',
    filePath: destPath,
    difficulty,
    durationSec: parsedSong.durationSec,
    bpm: parsedSong.bpm,
    noteCount: parsedSong.notes.length,
    tags: [],
    trackAssignments: getTrackAssignments(parsedSong),
  });

  return {
    songId,
    destPath,
    fileData,
    title: row.title,
    durationSec: row.durationSec,
    bpm: row.bpm,
    noteCount: row.noteCount,
    difficulty: row.difficulty,
  };
}
