import { describe, expect, it } from 'vitest';
import type { GameResultRow, SongRow, UserStatsRow } from '../../shared/dbTypes';
import { generateRecommendations } from './recommendationEngine';

function createSong(overrides: Partial<SongRow>): SongRow {
  return {
    id: overrides.id ?? 'song',
    title: overrides.title ?? 'Song',
    artist: overrides.artist ?? '',
    genre: overrides.genre ?? '',
    filePath: overrides.filePath ?? '',
    difficulty: overrides.difficulty ?? 3,
    durationSec: overrides.durationSec ?? 60,
    bpm: overrides.bpm ?? 120,
    noteCount: overrides.noteCount ?? 100,
    dateAdded: overrides.dateAdded ?? '2026-04-01T00:00:00.000Z',
    timesPlayed: overrides.timesPlayed ?? 0,
    tags: overrides.tags ?? [],
    isFavorite: overrides.isFavorite ?? false,
    folderId: overrides.folderId ?? null,
    trackAssignments: overrides.trackAssignments ?? { left: 'left', right: 'right' },
  };
}

function createResult(overrides: Partial<GameResultRow>): GameResultRow {
  return {
    id: overrides.id ?? 'result',
    songId: overrides.songId ?? 'song',
    score: overrides.score ?? 1000,
    accuracy: overrides.accuracy ?? 80,
    maxCombo: overrides.maxCombo ?? 10,
    perfectHits: overrides.perfectHits ?? 10,
    goodHits: overrides.goodHits ?? 0,
    okHits: overrides.okHits ?? 0,
    misses: overrides.misses ?? 0,
    timestamp: overrides.timestamp ?? '2026-04-01T12:00:00.000Z',
    tempo: overrides.tempo ?? 1,
    mode: overrides.mode ?? 'piano-hero',
    durationSec: overrides.durationSec ?? 60,
  };
}

describe('generateRecommendations', () => {
  it('builds the four recommendation buckets without reusing songs', () => {
    const songs = [
      createSong({ id: 'success', title: 'Steady Prelude', genre: 'Classical', difficulty: 3, timesPlayed: 2 }),
      createSong({ id: 'challenge', title: 'Brighter Etude', genre: 'Jazz', difficulty: 4 }),
      createSong({ id: 'weak', title: 'Uneven Waltz', genre: 'Pop', difficulty: 3, timesPlayed: 1 }),
      createSong({ id: 'builder', title: 'Coordination Study', genre: 'Etude', difficulty: 3 }),
      createSong({ id: 'genre-pick', title: 'Moonlit Theme', genre: 'Classical', difficulty: 1 }),
      createSong({
        id: 'revisit',
        title: 'Return Passage',
        genre: 'Jazz',
        difficulty: 2,
        timesPlayed: 3,
        trackAssignments: { lead: 'left', pedal: 'left' },
      }),
    ];

    const statsBySongId: Record<string, UserStatsRow | null> = {
      success: {
        songId: 'success',
        playCount: 2,
        bestScore: 1200,
        averageScore: 1100,
        bestAccuracy: 84,
        lastPlayed: '2026-04-01T12:00:00.000Z',
        totalPracticeTimeSec: 120,
      },
      weak: {
        songId: 'weak',
        playCount: 1,
        bestScore: 800,
        averageScore: 800,
        bestAccuracy: 62,
        lastPlayed: '2026-03-31T12:00:00.000Z',
        totalPracticeTimeSec: 60,
      },
      revisit: {
        songId: 'revisit',
        playCount: 3,
        bestScore: 950,
        averageScore: 910,
        bestAccuracy: 75,
        lastPlayed: '2026-03-01T12:00:00.000Z',
        totalPracticeTimeSec: 180,
      },
      challenge: null,
      builder: null,
      'genre-pick': null,
    };

    const recentResults30 = [
      createResult({ id: 'r1', songId: 'success', accuracy: 82, timestamp: '2026-04-01T12:00:00.000Z' }),
      createResult({ id: 'r2', songId: 'success', accuracy: 85, timestamp: '2026-03-29T12:00:00.000Z' }),
      createResult({ id: 'r3', songId: 'weak', accuracy: 60, timestamp: '2026-03-30T12:00:00.000Z' }),
      createResult({ id: 'r4', songId: 'revisit', accuracy: 74, timestamp: '2026-03-10T12:00:00.000Z' }),
    ];

    const recommendations = generateRecommendations({
      songs,
      userStatsBySongId: statsBySongId,
      recentResults30,
      recentResults60: recentResults30,
    });

    expect(recommendations.nextChallenge[0]?.song.id).toBe('challenge');
    expect(recommendations.skillBuilder[0]?.song.id).toBe('builder');
    expect(recommendations.youMightLike[0]?.song.id).toBe('genre-pick');
    expect(recommendations.revisit[0]?.song.id).toBe('revisit');

    const allIds = [
      ...recommendations.nextChallenge,
      ...recommendations.skillBuilder,
      ...recommendations.youMightLike,
      ...recommendations.revisit,
    ].map((item) => item.song.id);

    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
