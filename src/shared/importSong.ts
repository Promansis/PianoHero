import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTrackAssignments } from '../lib/game/songUtils';
import { parseMidiFile } from '../lib/midi/midiFileParser';
import type { AppDatabase } from '../main/database';
import type { ImportedSong } from './ipc';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function createSongId(buffer: Uint8Array): Promise<string> {
  return createHash('sha256').update(buffer).digest('hex');
}

export function calculateDifficulty(noteCount: number, durationSec: number): number {
  const safeDuration = Math.max(durationSec, 1);
  return Math.max(1, Math.min(10, Math.round((noteCount / safeDuration) * 1.2)));
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
  const parsedSong = parseMidiFile(toArrayBuffer(fileData), { songId, title });
  const difficulty = calculateDifficulty(parsedSong.notes.length, parsedSong.durationSec);

  await writeFile(destPath, fileData);

  const row = db.addSong({
    id: songId,
    title,
    artist: '',
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
