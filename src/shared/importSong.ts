import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TrackAssignment } from '../lib/game/types';
import type { ParsedSong } from '../lib/game/types';
import { getTrackAssignments } from '../lib/game/songUtils';
import { extractMidiMeta, parseMidiFile } from '../lib/midi/midiFileParser';
import type { AppDatabase } from '../main/database';
import type { SongRow } from './dbTypes';
import type { ImportError, ImportedSong, RecomputeDifficultiesResult } from './ipc';

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
  const density = notes.length / safeDuration;
  const densityScore = Math.min(10, density * 1.2);

  const midiValues = notes.map((n) => n.midi);
  const pitchRange = Math.max(...midiValues) - Math.min(...midiValues);
  const rangeScore = Math.min(10, pitchRange / 8);

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

  const tempoScore = Math.min(10, (Math.max(bpm, 40) / 120) * 10);

  const beatWindowSec = 60 / Math.max(bpm, 40);
  const independenceWindows = new Map<number, { left: number[]; right: number[] }>();
  for (const note of notes) {
    const beatIndex = Math.floor(note.startSec / beatWindowSec);
    const bucket = independenceWindows.get(beatIndex) ?? { left: [], right: [] };
    if (note.hand === 'left') {
      bucket.left.push(note.midi);
    } else if (note.hand === 'right') {
      bucket.right.push(note.midi);
    }
    independenceWindows.set(beatIndex, bucket);
  }

  let divergenceTotal = 0;
  let divergenceCount = 0;
  for (const bucket of independenceWindows.values()) {
    if (bucket.left.length === 0 || bucket.right.length === 0) {
      continue;
    }
    const leftAvg = bucket.left.reduce((sum, midi) => sum + midi, 0) / bucket.left.length;
    const rightAvg = bucket.right.reduce((sum, midi) => sum + midi, 0) / bucket.right.length;
    divergenceTotal += Math.min(60, Math.abs(rightAvg - leftAvg));
    divergenceCount += 1;
  }
  const independenceScore =
    divergenceCount === 0 ? 0 : Math.min(10, (divergenceTotal / divergenceCount) / 6);

  const raw =
    densityScore * 0.4 +
    rangeScore * 0.2 +
    chordScore * 0.2 +
    tempoScore * 0.1 +
    independenceScore * 0.1;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

interface ImportSongOptions {
  db: AppDatabase;
  midiFilesDir: string;
}

interface ComputedSongMetadata {
  artist: string;
  bpm: number;
  difficulty: number;
  durationSec: number;
  noteCount: number;
  title: string;
  trackAssignments: Record<string, TrackAssignment>;
}

function computeSongMetadata(
  buffer: Uint8Array,
  title: string,
  existingTrackAssignments: Record<string, TrackAssignment> = {},
): ComputedSongMetadata {
  const midiMeta = extractMidiMeta(toArrayBuffer(buffer));
  const effectiveTitle = midiMeta.suggestedTitle || title;
  const parsedSong = parseMidiFile(toArrayBuffer(buffer), { songId: 'preview', title: effectiveTitle });
  const defaultAssignments = getTrackAssignments(parsedSong);

  return {
    artist: midiMeta.suggestedArtist ?? '',
    bpm: parsedSong.bpm,
    difficulty: calculateDifficulty(parsedSong),
    durationSec: parsedSong.durationSec,
    noteCount: parsedSong.notes.length,
    title: effectiveTitle,
    trackAssignments: {
      ...defaultAssignments,
      ...existingTrackAssignments,
    },
  };
}

function resolveStoredMidiPath(song: SongRow, midiFilesDir: string): string {
  return song.filePath?.trim() ? song.filePath : join(midiFilesDir, `${song.id}.mid`);
}

export async function importSongFromBuffer(
  buffer: Uint8Array,
  title: string,
  { db, midiFilesDir }: ImportSongOptions,
): Promise<ImportedSong> {
  const fileData = Uint8Array.from(buffer);
  const songId = await createSongId(fileData);
  const destPath = join(midiFilesDir, `${songId}.mid`);
  const existingSong = db.getSong(songId);
  const metadata = computeSongMetadata(fileData, title, existingSong?.trackAssignments);

  await writeFile(destPath, fileData);

  if (existingSong) {
    const shouldRefreshDescriptiveMetadata =
      existingSong.filePath.trim() === '' && existingSong.noteCount === 0;
    db.updateSong(songId, {
      artist: shouldRefreshDescriptiveMetadata ? metadata.artist : existingSong.artist,
      bpm: metadata.bpm,
      difficulty: metadata.difficulty,
      durationSec: metadata.durationSec,
      filePath: destPath,
      noteCount: metadata.noteCount,
      title: shouldRefreshDescriptiveMetadata ? metadata.title : existingSong.title,
      trackAssignments: metadata.trackAssignments,
    });
  } else {
    db.addSong({
      id: songId,
      title: metadata.title,
      artist: metadata.artist,
      genre: '',
      filePath: destPath,
      difficulty: metadata.difficulty,
      durationSec: metadata.durationSec,
      bpm: metadata.bpm,
      noteCount: metadata.noteCount,
      tags: [],
      trackAssignments: metadata.trackAssignments,
    });
  }

  const row = db.getSong(songId)!;

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

export async function recomputeAllSongDifficulties(
  { db, midiFilesDir }: ImportSongOptions,
): Promise<RecomputeDifficultiesResult> {
  const songs = db.getAllSongs();
  const errors: ImportError[] = [];
  let updated = 0;

  for (const song of songs) {
    try {
      const buffer = await readFile(resolveStoredMidiPath(song, midiFilesDir));
      const metadata = computeSongMetadata(buffer, song.title, song.trackAssignments);
      db.updateSong(song.id, {
        bpm: metadata.bpm,
        difficulty: metadata.difficulty,
        durationSec: metadata.durationSec,
        noteCount: metadata.noteCount,
        trackAssignments: metadata.trackAssignments,
      });
      updated += 1;
    } catch (error) {
      errors.push({
        filename: song.title,
        message: (error as Error).message,
      });
    }
  }

  return { updated, errors };
}
