import type {
  GameResultRow,
  RecommendationItem,
  RecommendationResult,
  SongRow,
  UserStatsRow,
} from '../../shared/dbTypes';

export interface RecommendationInputs {
  songs: SongRow[];
  userStatsBySongId: Record<string, UserStatsRow | null>;
  recentResults30: GameResultRow[];
  recentResults60: GameResultRow[];
}

interface SongPerformanceSummary {
  songId: string;
  lastPlayed: string | null;
  playCount: number;
  averageAccuracy: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizePerformance(results: GameResultRow[]): Map<string, SongPerformanceSummary> {
  const grouped = new Map<string, GameResultRow[]>();
  for (const result of results) {
    const bucket = grouped.get(result.songId) ?? [];
    bucket.push(result);
    grouped.set(result.songId, bucket);
  }

  return new Map(
    [...grouped.entries()].map(([songId, bucket]) => [
      songId,
      {
        songId,
        lastPlayed: bucket
          .map((entry) => entry.timestamp)
          .sort((left, right) => right.localeCompare(left))[0] ?? null,
        playCount: bucket.length,
        averageAccuracy: average(bucket.map((entry) => entry.accuracy)),
      },
    ]),
  );
}

function isBalancedHandSong(song: SongRow): boolean {
  const assignments = Object.values(song.trackAssignments);
  if (assignments.length === 0) {
    return true;
  }

  const leftCount = assignments.filter((assignment) => assignment === 'left').length;
  const rightCount = assignments.filter((assignment) => assignment === 'right').length;
  if (leftCount === 0 || rightCount === 0) {
    return false;
  }

  const ratio = leftCount / rightCount;
  return ratio >= 0.6 && ratio <= 1.66;
}

function byDifficultyThenRecency(
  left: SongRow,
  right: SongRow,
  performance: Map<string, SongPerformanceSummary>,
): number {
  const difficultyDelta = left.difficulty - right.difficulty;
  if (difficultyDelta !== 0) {
    return difficultyDelta;
  }

  const leftPlayed = performance.get(left.id)?.lastPlayed ?? '';
  const rightPlayed = performance.get(right.id)?.lastPlayed ?? '';
  return leftPlayed.localeCompare(rightPlayed);
}

function takeSongs(
  songs: SongRow[],
  usedIds: Set<string>,
  reasonBuilder: (song: SongRow) => string,
  limit = 3,
): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  for (const song of songs) {
    if (usedIds.has(song.id)) {
      continue;
    }

    usedIds.add(song.id);
    items.push({
      song,
      reason: reasonBuilder(song),
    });

    if (items.length >= limit) {
      break;
    }
  }

  return items;
}

export function generateRecommendations({
  songs,
  userStatsBySongId,
  recentResults30,
  recentResults60,
}: RecommendationInputs): RecommendationResult {
  const usedIds = new Set<string>();
  const recent30BySong = summarizePerformance(recentResults30);
  const recent60BySong = summarizePerformance(recentResults60);

  const recentSuccesses = songs.filter((song) => {
    const performance = recent30BySong.get(song.id);
    return performance !== undefined && performance.averageAccuracy !== null && performance.averageAccuracy >= 80;
  });
  const historicallyStrongSongs = songs.filter((song) => (userStatsBySongId[song.id]?.bestAccuracy ?? 0) >= 80);
  const baselineDifficulty =
    average(recentSuccesses.map((song) => song.difficulty)) ??
    average(historicallyStrongSongs.map((song) => song.difficulty)) ??
    3;

  const nextChallengeCandidates = [...songs]
    .filter((song) => song.difficulty >= Math.ceil(baselineDifficulty + 1) && song.difficulty <= Math.ceil(baselineDifficulty + 2))
    .filter((song) => {
      const stats = userStatsBySongId[song.id];
      const recentPerformance = recent30BySong.get(song.id);
      return !stats || !recentPerformance || (recentPerformance.averageAccuracy ?? 0) < 70;
    })
    .sort((left, right) => byDifficultyThenRecency(left, right, recent30BySong));

  const weakerSongs = songs.filter((song) => {
    const performance = recent30BySong.get(song.id);
    return performance !== undefined && performance.averageAccuracy !== null && performance.averageAccuracy < 75;
  });
  const skillTargetDifficulty =
    average(weakerSongs.map((song) => song.difficulty)) ?? Math.max(2, Math.round(baselineDifficulty));
  const skillBuilderCandidates = [...songs]
    .filter((song) => isBalancedHandSong(song))
    .filter((song) => Math.abs(song.difficulty - skillTargetDifficulty) <= 1)
    .sort((left, right) => byDifficultyThenRecency(left, right, recent30BySong));

  const genreCounts = new Map<string, number>();
  for (const result of recentResults60) {
    const song = songs.find((entry) => entry.id === result.songId);
    if (!song?.genre.trim()) {
      continue;
    }
    genreCounts.set(song.genre, (genreCounts.get(song.genre) ?? 0) + 1);
  }
  const preferredGenres = [...genreCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([genre]) => genre)
    .slice(0, 2);
  const youMightLikeCandidates = [...songs]
    .filter((song) => preferredGenres.includes(song.genre))
    .filter((song) => (userStatsBySongId[song.id]?.playCount ?? 0) <= 1)
    .sort((left, right) => {
      const leftGenreCount = genreCounts.get(left.genre) ?? 0;
      const rightGenreCount = genreCounts.get(right.genre) ?? 0;
      if (leftGenreCount !== rightGenreCount) {
        return rightGenreCount - leftGenreCount;
      }
      return left.title.localeCompare(right.title);
    });

  const revisitCandidates = [...songs]
    .filter((song) => {
      const stats = userStatsBySongId[song.id];
      if (!stats || stats.playCount === 0) {
        return false;
      }
      const recentPerformance = recent60BySong.get(song.id)?.averageAccuracy ?? stats.bestAccuracy;
      return recentPerformance >= 60 && recentPerformance <= 85;
    })
    .sort((left, right) => {
      const leftPlayed = userStatsBySongId[left.id]?.lastPlayed ?? '';
      const rightPlayed = userStatsBySongId[right.id]?.lastPlayed ?? '';
      return leftPlayed.localeCompare(rightPlayed);
    });

  return {
    nextChallenge: takeSongs(
      nextChallengeCandidates,
      usedIds,
      (song) => `Difficulty ${song.difficulty} is just above your recent comfort zone.`,
    ),
    skillBuilder: takeSongs(
      skillBuilderCandidates,
      usedIds,
      () => 'Balanced hand work to reinforce coordination and timing.',
    ),
    youMightLike: takeSongs(
      youMightLikeCandidates,
      usedIds,
      (song) => `You have been leaning into ${song.genre || 'this style'} lately.`,
    ),
    revisit: takeSongs(
      revisitCandidates,
      usedIds,
      () => 'Solid foundation already there. Another pass should convert this into a strong score.',
    ),
  };
}
