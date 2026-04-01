import type { GameResult, NoteJudgement, ScoreSnapshot, SessionMode } from './types';

const PERFECT_WINDOW_SEC = 0.025;
const GOOD_WINDOW_SEC = 0.05;
const OK_WINDOW_SEC = 0.1;

const BASE_POINTS: Record<Exclude<NoteJudgement, 'pending'>, number> = {
  perfect: 100,
  good: 75,
  ok: 50,
  miss: 0,
};

const MAX_MULTIPLIER = 3.0;
const MULTIPLIER_STEP = 0.1;
const COMBO_PER_STEP = 10;

export class ScoringEngine {
  private totalScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private goodCount = 0;
  private okCount = 0;
  private missCount = 0;
  private totalNotes = 0;
  private measureBuckets = new Map<number, { hits: number; total: number }>();

  constructor(totalNotes: number) {
    this.totalNotes = totalNotes;
  }

  judgeTiming(deltaSec: number): Exclude<NoteJudgement, 'pending'> {
    const absoluteDelta = Math.abs(deltaSec);
    if (absoluteDelta <= PERFECT_WINDOW_SEC) {
      return 'perfect';
    }
    if (absoluteDelta <= GOOD_WINDOW_SEC) {
      return 'good';
    }
    if (absoluteDelta <= OK_WINDOW_SEC) {
      return 'ok';
    }
    return 'miss';
  }

  getComboMultiplier(): number {
    return Math.min(
      MAX_MULTIPLIER,
      1 + Math.floor(this.combo / COMBO_PER_STEP) * MULTIPLIER_STEP,
    );
  }

  recordHit(tier: Exclude<NoteJudgement, 'pending' | 'miss'>, measureIndex: number): void {
    const multiplier = this.getComboMultiplier();
    this.totalScore += Math.round(BASE_POINTS[tier] * multiplier);
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    if (tier === 'perfect') {
      this.perfectCount += 1;
    } else if (tier === 'good') {
      this.goodCount += 1;
    } else {
      this.okCount += 1;
    }

    this.recordMeasureResult(measureIndex, true);
  }

  recordMiss(measureIndex: number): void {
    this.combo = 0;
    this.missCount += 1;
    this.recordMeasureResult(measureIndex, false);
  }

  getSnapshot(): ScoreSnapshot {
    const judgedNotes = this.perfectCount + this.goodCount + this.okCount + this.missCount;
    const weightedHits =
      this.perfectCount * BASE_POINTS.perfect +
      this.goodCount * BASE_POINTS.good +
      this.okCount * BASE_POINTS.ok;
    const accuracy = judgedNotes === 0 ? 100 : (weightedHits / (judgedNotes * 100)) * 100;

    return {
      totalScore: this.totalScore,
      combo: this.combo,
      maxCombo: this.maxCombo,
      comboMultiplier: this.getComboMultiplier(),
      accuracy: Math.round(accuracy * 10) / 10,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      okCount: this.okCount,
      missCount: this.missCount,
      totalNotes: this.totalNotes,
      judgedNotes,
      measureAccuracy: this.buildMeasureAccuracy(),
    };
  }

  getFinalResult(songId: string, mode: SessionMode, tempo: number, durationSec: number): GameResult {
    const snapshot = this.getSnapshot();
    return {
      songId,
      score: snapshot.totalScore,
      accuracy: snapshot.accuracy,
      maxCombo: snapshot.maxCombo,
      perfectHits: snapshot.perfectCount,
      goodHits: snapshot.goodCount,
      okHits: snapshot.okCount,
      misses: snapshot.missCount,
      tempo,
      mode,
      durationSec,
      measureAccuracy: snapshot.measureAccuracy,
    };
  }

  reset(totalNotes: number): void {
    this.totalScore = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.okCount = 0;
    this.missCount = 0;
    this.totalNotes = totalNotes;
    this.measureBuckets.clear();
  }

  private recordMeasureResult(measureIndex: number, isHit: boolean): void {
    const bucket = this.measureBuckets.get(measureIndex) ?? { hits: 0, total: 0 };
    bucket.total += 1;
    if (isHit) {
      bucket.hits += 1;
    }
    this.measureBuckets.set(measureIndex, bucket);
  }

  private buildMeasureAccuracy(): Array<{ measure: number; accuracy: number }> {
    return [...this.measureBuckets.entries()]
      .map(([measure, bucket]) => ({
        measure,
        accuracy: bucket.total === 0 ? 100 : Math.round((bucket.hits / bucket.total) * 100),
      }))
      .sort((left, right) => left.measure - right.measure);
  }
}
