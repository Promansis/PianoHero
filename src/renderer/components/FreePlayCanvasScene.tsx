import { useEffect, useRef } from 'react';
import type { FreePlayVisualMode, FreePlayVisualNote, VisualPreset } from './FreePlayVisualTypes';
import {
  applyNoteToHeatmap,
  buildHeatHistoryRow,
  calculateHarmonyEnergy,
  calculatePitchCenter,
  calculateSilenceProgress,
  calculateVisualIntensity,
  classifyNoteRegister,
  clamp,
  coolHeatValues,
  detectKeyCenter,
  findPeakHeatZones,
  lerp,
  midiToHue,
  midiToLabel,
  adaptiveLaneRatio,
  midiToLaneRatio,
  midiToWatercolorHue,
  pitchClassLabel,
  selectConstellationMotif,
  type NoteRegister,
  type RepeatedNoteStat,
  type RollingNoteEvent,
} from './freePlayVisualState';

interface FreePlayCanvasSceneProps {
  mode: FreePlayVisualMode;
  activeNotes: number[];
  recentNotes: FreePlayVisualNote[];
  sustainOn: boolean;
  metronomeEnabled: boolean;
  metronomeBeat: number;
  visualPreset: VisualPreset;
}

// Internal effect profile — per-preset tuning knobs for bloom and post-processing
interface SceneEffectProfile {
  bloomBlurMin: number;
  bloomBlurMax: number;
  bloomAlphaCap: number;
  vignetteStrength: number;
  colorGradeStrength: number;
}

// Placeholder shapes for a future layered render pipeline (not wired into live rendering)
// interface FrameVisualMetrics { intensity: number; harmony: number; silence: number; }
// interface RenderPassConfig { id: string; enabled: boolean; blendMode: string; }

interface ScenePalette {
  bgTop: string;
  bgBottom: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  grid: string;
  surface: string;
}

interface NoteBurst {
  id: string;
  midi: number;
  velocity: number;
  hue: number;
  createdAt: number;
}

interface RibbonTrail {
  id: string;
  midi: number;
  hue: number;
  velocity: number;
  createdAt: number;
}

interface OrbitTrailPoint {
  x: number;
  y: number;
  createdAt: number;
}

interface OrbitBody {
  id: string;
  midi: number;
  hue: number;
  angle: number;
  angularVelocity: number;
  semiMajor: number;
  semiMinor: number;
  radius: number;
  radiusTarget: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  lastHitAt: number;
  trail: OrbitTrailPoint[];
}

interface StarNode {
  id: string;
  midi: number;
  x: number;
  y: number;
  hue: number;
  radius: number;
  createdAt: number;
  twinkleOffset: number;
}

interface ConstellationPath {
  id: string;
  starIds: string[];
  hue: number;
  createdAt: number;
}

interface ShootingStar {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
  lifeMs: number;
}

interface FogPuff {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  createdAt: number;
  lifeMs: number;
  alpha: number;
}

interface InkBlob {
  id: string;
  x: number;
  y: number;
  hue: number;
  radius: number;
  targetRadius: number;
  spreadRate: number;
  alpha: number;
  driftX: number;
  driftY: number;
  createdAt: number;
}

interface TreeAnchor {
  x: number;
  y: number;
  angle: number;
  depth: number;
  kind: 'root' | 'trunk' | 'branch';
  strength: number;
  branchDepth: number; // 0 for root/trunk, 1+ for branch generations
}

interface TreeSegment {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  hue: number;
  createdAt: number;
  kind: 'root' | 'trunk' | 'branch';
  swayOffset: number;
  swaySpeed: number;
}

interface TreeOrnament {
  id: string;
  x: number;
  y: number;
  radius: number;
  hue: number;
  sat: number;
  light: number;
  createdAt: number;
  kind: 'leaf' | 'bloom' | 'fruit' | 'star' | 'diamond';
  shape: 'ellipse' | 'circle' | 'star' | 'diamond' | 'heart' | 'teardrop';
  drift: number;
  shimmer: number;
}

interface GalaxyParticle {
  id: string;
  arm: number;
  angle: number;
  baseRadiusRatio: number;
  radiusRatio: number;
  targetRadiusRatio: number;
  spin: number;
  size: number;
  hue: number;
  alpha: number;
  createdAt: number;
  sparkle: number;
}

interface AuroraRibbon {
  id: string;
  register: NoteRegister;
  hue: number;
  baseY: number;
  amplitude: number;
  targetAmplitude: number;
  thickness: number;
  speed: number;
  phase: number;
  alpha: number;
  shimmer: number;
  createdAt: number;
  lastHitAt: number;
}

interface FireworkTrailPoint {
  x: number;
  y: number;
  createdAt: number;
}

interface FireworkShell {
  id: string;
  midi: number;
  x: number;
  y: number;
  targetY: number;
  vy: number;
  hue: number;
  size: number;
  burstCount: number;
  createdAt: number;
  trail: FireworkTrailPoint[];
}

interface FireworkParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  size: number;
  alpha: number;
  drag: number;
  gravity: number;
  createdAt: number;
  lifeMs: number;
  sparkle: number;
}

interface MetronomePulse {
  createdAt: number;
}

interface GeometryRing {
  id: string;
  midi: number;
  hue: number;
  x: number;
  y: number;
  sides: number;
  radius: number;
  targetRadius: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  createdAt: number;
}

interface Bubble {
  id: string;
  midi: number;
  x: number;
  y: number;
  radius: number;
  hue: number;
  vx: number;
  vy: number;
  baseVy: number; // full-speed vy; vy is adjusted dynamically when key is held
  wobblePhase: number;
  createdAt: number;
  lifetime: number;
  popThreshold: number; // y position (0-1) where bubble will pop
}

interface BubblePop {
  x: number;
  y: number;
  hue: number;
  particles: Array<{ dx: number; dy: number }>;
  createdAt: number;
}

interface SceneState {
  processedNoteIds: Set<string>;
  processedOrder: string[];
  noteHistory: RollingNoteEvent[];
  repeatedStats: Map<number, RepeatedNoteStat>;
  heatValues: number[];
  heatHistory: Array<{ createdAt: number; values: number[] }>;
  stageBursts: NoteBurst[];
  ribbons: RibbonTrail[];
  orbitBodies: OrbitBody[];
  stars: StarNode[];
  constellationPaths: ConstellationPath[];
  shootingStars: ShootingStar[];
  fogPuffs: FogPuff[];
  inkBlobs: InkBlob[];
  treeAnchors: TreeAnchor[];
  treeSegments: TreeSegment[];
  treeOrnaments: TreeOrnament[];
  galaxyParticles: GalaxyParticle[];
  auroraBands: AuroraRibbon[];
  fireworkShells: FireworkShell[];
  fireworkParticles: FireworkParticle[];
  geometryRings: GeometryRing[];
  metronomePulses: MetronomePulse[];
  bubbles: Bubble[];
  bubblePops: BubblePop[];
  sustainEnvelope: number;
  lidAngle: number;
  pageFlutter: number;
  starfieldRotation: number;
  treeGlow: number;
  treeNoteCount: number;
  treeNextBranchSide: number;
  galaxySupernova: number;
  galaxySpinBoost: number;
  lastHarmony: number;
  auroraEnergy: number;
  skyWarmth: number;
  lastFrameAt: number | null;
  lastHeatRowAt: number;
  lastFogSpawnAt: number;
  lastMetronomeBeat: number;
  lastSustainOn: boolean;
  lastFireworkFlashAt: number;
  adaptiveMin: number;
  adaptiveMax: number;
}

function createSceneState(): SceneState {
  return {
    processedNoteIds: new Set<string>(),
    processedOrder: [],
    noteHistory: [],
    repeatedStats: new Map<number, RepeatedNoteStat>(),
    heatValues: Array.from({ length: 88 }, () => 0),
    heatHistory: [],
    stageBursts: [],
    ribbons: [],
    orbitBodies: [],
    stars: [],
    constellationPaths: [],
    shootingStars: [],
    fogPuffs: [],
    inkBlobs: [],
    treeAnchors: [
      { x: 0.5, y: 0.88, angle: -Math.PI / 2, depth: 0, kind: 'trunk', strength: 1, branchDepth: 0 },
      { x: 0.5, y: 0.89, angle: Math.PI * 0.82, depth: 0, kind: 'root', strength: 0.9, branchDepth: 0 },
      { x: 0.5, y: 0.89, angle: Math.PI * 0.18, depth: 0, kind: 'root', strength: 0.9, branchDepth: 0 },
    ],
    treeSegments: [],
    treeOrnaments: [],
    galaxyParticles: [],
    auroraBands: [],
    fireworkShells: [],
    fireworkParticles: [],
    geometryRings: [],
    metronomePulses: [],
    bubbles: [],
    bubblePops: [],
    sustainEnvelope: 0,
    lidAngle: 0.2,
    pageFlutter: 0,
    starfieldRotation: 0,
    treeGlow: 0,
    treeNoteCount: 0,
    treeNextBranchSide: 0,
    galaxySupernova: 0,
    galaxySpinBoost: 0,
    lastHarmony: 0,
    auroraEnergy: 0,
    skyWarmth: 0,
    lastFrameAt: null,
    lastHeatRowAt: 0,
    lastFogSpawnAt: 0,
    lastMetronomeBeat: 0,
    lastSustainOn: false,
    lastFireworkFlashAt: 0,
    adaptiveMin: 21,
    adaptiveMax: 108,
  };
}

function readPalette(): ScenePalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    bgTop: styles.getPropertyValue('--color-stage-bg-top').trim() || '#0e1730',
    bgBottom: styles.getPropertyValue('--color-stage-bg-bottom').trim() || '#040811',
    text: styles.getPropertyValue('--color-note-text').trim() || 'rgba(245, 248, 255, 0.94)',
    textMuted: styles.getPropertyValue('--color-text-muted').trim() || 'rgba(220, 230, 255, 0.72)',
    accent: styles.getPropertyValue('--color-accent').trim() || '#6f97ff',
    accentSecondary: styles.getPropertyValue('--color-accent-secondary').trim() || '#ff9666',
    grid: styles.getPropertyValue('--color-chart-grid').trim() || 'rgba(150, 175, 235, 0.14)',
    surface: styles.getPropertyValue('--panel-bg').trim() || 'rgba(10, 18, 32, 0.72)',
  };
}

function hsla(hue: number, saturation: number, lightness: number, alpha = 1): string {
  return `hsla(${Math.round(hue)}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededUnit(value: string, offset = 0): number {
  return ((hashString(`${value}:${offset}`) % 1000) + 1) / 1001;
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  topColor: string,
  bottomColor: string,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawSoftGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  hue: number,
  alpha: number,
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hsla(hue, 92, 82, alpha));
  gradient.addColorStop(0.45, hsla(hue, 92, 70, alpha * 0.46));
  gradient.addColorStop(1, hsla(hue, 92, 64, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function trimSceneState(state: SceneState, now: number): void {
  state.noteHistory = state.noteHistory.filter((event) => now - event.createdAt <= 30000);
  state.stageBursts = state.stageBursts.filter((burst) => now - burst.createdAt <= 2200);
  state.ribbons = state.ribbons.filter((trail) => now - trail.createdAt <= 4200);
  state.orbitBodies = state.orbitBodies.filter((body) => now - body.lastHitAt <= 22000 || body.radius > 6);
  state.shootingStars = state.shootingStars.filter((star) => now - star.createdAt <= star.lifeMs);
  state.fogPuffs = state.fogPuffs.filter((puff) => now - puff.createdAt <= puff.lifeMs);
  state.metronomePulses = state.metronomePulses.filter((pulse) => now - pulse.createdAt <= 900);
  state.constellationPaths = state.constellationPaths.filter((path) => now - path.createdAt <= 24000);
  state.stars = state.stars.slice(-240);
  state.inkBlobs = state.inkBlobs.filter((blob) => now - blob.createdAt <= 120000 && blob.alpha >= 0.01).slice(-260);
  state.treeSegments = state.treeSegments.slice(-520);
  state.treeOrnaments = state.treeOrnaments.slice(-700);
  state.treeAnchors = state.treeAnchors.slice(-220);
  state.galaxyParticles = state.galaxyParticles
    .filter((particle) => now - particle.createdAt <= 90000 && particle.alpha >= 0.02)
    .slice(-1400);
  state.auroraBands = state.auroraBands
    .filter((band) => now - band.lastHitAt <= 45000 || band.alpha >= 0.08)
    .slice(-28);
  state.fireworkShells = state.fireworkShells.filter((shell) => now - shell.createdAt <= 2200);
  state.fireworkParticles = state.fireworkParticles.filter(
    (particle) => now - particle.createdAt <= particle.lifeMs && particle.alpha >= 0.01,
  );
  state.geometryRings = state.geometryRings
    .filter((ring) => ring.alpha > 0.015 && now - ring.createdAt <= 60000)
    .slice(-200);

  const expiredBubbles = state.bubbles.filter((b) => now - b.createdAt > b.lifetime || b.y < -0.04 || b.y <= b.popThreshold);
  for (const b of expiredBubbles) {
    state.bubblePops.push({
      x: b.x,
      y: b.y,
      hue: b.hue,
      particles: Array.from({ length: 7 }, () => ({
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
      })),
      createdAt: now,
    });
  }
  state.bubbles = state.bubbles.filter((b) => now - b.createdAt <= b.lifetime && b.y >= -0.04 && b.y > b.popThreshold);
  state.bubblePops = state.bubblePops.filter((p) => now - p.createdAt < 500);

  if (state.processedOrder.length > 4000) {
    const excess = state.processedOrder.length - 4000;
    for (const id of state.processedOrder.splice(0, excess)) {
      state.processedNoteIds.delete(id);
    }
  }
}

function addInkBloom(state: SceneState, note: FreePlayVisualNote): void {
  const lane = adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax);
  const seedX = seededUnit(note.id, 1);
  const seedY = seededUnit(note.id, 2);
  state.inkBlobs.push({
    id: note.id,
    x: clamp(lerp(0.08, 0.92, lane) + (seedX - 0.5) * 0.04, 0.06, 0.94),
    y: clamp(lerp(0.78, 0.22, lane) + (seedY - 0.5) * 0.18, 0.14, 0.86),
    hue: midiToWatercolorHue(note.midi),
    radius: 14 + note.velocity * 24,
    targetRadius: 34 + note.velocity * 82,
    spreadRate: lerp(0.016, 0.034, lane) * (0.7 + note.velocity * 0.6),
    alpha: 0.11 + note.velocity * 0.16,
    driftX: (seededUnit(note.id, 3) - 0.5) * 0.000012,
    driftY: (seededUnit(note.id, 4) - 0.5) * 0.00001,
    createdAt: note.createdAt,
  });
}

function chooseTreeAnchor(anchors: TreeAnchor[], kind: TreeAnchor['kind'], seed: number): TreeAnchor {
  const matching = anchors.filter((anchor) => anchor.kind === kind);
  if (matching.length === 0) {
    return anchors[anchors.length - 1];
  }
  const recent = matching.slice(-Math.min(8, matching.length));
  return recent[Math.min(recent.length - 1, Math.floor(seed * recent.length))];
}

function chooseTreeAnchorByDepth(
  anchors: TreeAnchor[],
  kind: TreeAnchor['kind'],
  targetBranchDepth: number,
  seed: number,
): TreeAnchor {
  const matching = anchors.filter(
    (a) => a.kind === kind && (a.branchDepth ?? 0) === targetBranchDepth,
  );
  if (matching.length === 0) {
    // Fall back to any trunk anchor
    return chooseTreeAnchor(anchors, 'trunk', seed);
  }
  const recent = matching.slice(-Math.min(8, matching.length));
  return recent[Math.min(recent.length - 1, Math.floor(seed * recent.length))];
}

const NEON_PALETTE = [
  { hue: 330, sat: 100, light: 65 }, // hot pink
  { hue: 195, sat: 100, light: 58 }, // electric blue
  { hue: 120, sat: 95, light: 55 },  // lime green
  { hue: 28, sat: 100, light: 60 },  // bright orange
  { hue: 180, sat: 100, light: 55 }, // cyan
  { hue: 295, sat: 95, light: 62 },  // magenta
  { hue: 60, sat: 100, light: 58 },  // electric yellow
  { hue: 160, sat: 90, light: 52 },  // teal
];

function pickOrnament(
  noteId: string,
  x: number,
  y: number,
  velocity: number,
  seed: number,
): TreeOrnament {
  const kindSeed = seededUnit(noteId, 9);
  const paletteSeed = seededUnit(noteId, 10);
  const paletteIdx = Math.floor(paletteSeed * NEON_PALETTE.length);
  const color = NEON_PALETTE[paletteIdx];
  const hueJitter = (seed - 0.5) * 30;

  let kind: TreeOrnament['kind'];
  let shape: TreeOrnament['shape'];
  let radius: number;

  if (kindSeed < 0.35) {
    kind = 'leaf'; shape = 'ellipse'; radius = 3 + velocity * 4;
  } else if (kindSeed < 0.55) {
    kind = 'bloom'; shape = 'circle'; radius = 3.5 + velocity * 5;
  } else if (kindSeed < 0.70) {
    kind = 'fruit'; shape = 'teardrop'; radius = 4 + velocity * 5;
  } else if (kindSeed < 0.85) {
    kind = 'star'; shape = 'star'; radius = 3 + velocity * 4.5;
  } else {
    kind = 'diamond'; shape = 'diamond'; radius = 3 + velocity * 4;
  }

  return {
    id: `orn-${noteId}`,
    x,
    y,
    radius,
    hue: (color.hue + hueJitter + 360) % 360,
    sat: color.sat,
    light: color.light,
    createdAt: Date.now(),
    kind,
    shape,
    drift: (seed - 0.5) * 14,
    shimmer: seededUnit(noteId, 6) * Math.PI * 2,
  };
}

function addTreeGrowth(state: SceneState, note: FreePlayVisualNote): void {
  const seed = seededUnit(note.id, 5);
  const velocity = clamp(note.velocity, 0.1, 1.25);

  state.treeNoteCount += 1;
  const n = state.treeNoteCount;

  if (n <= 4) {
    // === ROOTS: first 4 notes grow downward/outward from the base, alternating L/R ===
    const side = state.treeNextBranchSide;
    state.treeNextBranchSide = 1 - state.treeNextBranchSide;
    const rootSpread = 0.4 + seed * 0.35;
    const angle = side === 0 ? Math.PI - rootSpread : rootSpread;
    const anchor = chooseTreeAnchor(state.treeAnchors, 'root', seed);
    const length = 0.04 + velocity * 0.06;
    const endX = clamp(anchor.x + Math.cos(angle) * length * 1.1, 0.1, 0.9);
    const endY = clamp(anchor.y + Math.sin(angle) * length, 0.7, 0.98);
    state.treeSegments.push({
      id: `tree-${note.id}`,
      startX: anchor.x,
      startY: anchor.y,
      endX,
      endY,
      thickness: 2.8 + velocity * 4,
      hue: 30 + seed * 14,
      createdAt: note.createdAt,
      kind: 'root',
      swayOffset: seed * Math.PI * 2,
      swaySpeed: 0.8 + seed * 0.5,
    });
    state.treeAnchors.push({
      x: endX, y: endY, angle, depth: anchor.depth + 1, kind: 'root',
      strength: clamp(anchor.strength * 0.95 + velocity * 0.1, 0.3, 1.2),
      branchDepth: 0,
    });

  } else if (n <= 12) {
    // === TRUNK: notes 5–12 always grow upward ===
    const anchor = chooseTreeAnchor(state.treeAnchors, 'trunk', seed);
    const angle = -Math.PI / 2 + (seed - 0.5) * 0.24;
    const length = 0.04 + velocity * 0.07;
    const endX = clamp(anchor.x + Math.cos(angle) * length * 0.42, 0.18, 0.82);
    const endY = clamp(anchor.y + Math.sin(angle) * length, 0.1, 0.92);
    state.treeSegments.push({
      id: `tree-${note.id}`,
      startX: anchor.x, startY: anchor.y, endX, endY,
      thickness: 5 + velocity * 7,
      hue: 30 + seed * 12,
      createdAt: note.createdAt,
      kind: 'trunk',
      swayOffset: seed * Math.PI * 2,
      swaySpeed: 0.7 + seed * 0.4,
    });
    state.treeAnchors.push({
      x: endX, y: endY, angle, depth: anchor.depth + 1, kind: 'trunk',
      strength: clamp(anchor.strength * 0.95 + velocity * 0.1, 0.3, 1.4),
      branchDepth: 0,
    });

  } else {
    // === TRUNK or BRANCHES: probability-based ===
    // Trunk keeps growing (up to ~28 segments) even after branching starts
    const trunkAnchorCount = state.treeAnchors.filter((a) => a.kind === 'trunk').length;
    const trunkProbability = clamp(1.0 - trunkAnchorCount / 28, 0.12, 1.0);
    const growTrunk = seed < trunkProbability;

    // Ornament-only: every 3rd note after n=18, once there are some branches
    const branchAnchors = state.treeAnchors.filter((a) => a.kind === 'branch');
    const ornamentOnly = n > 18 && n % 3 === 0 && branchAnchors.length >= 3;

    if (growTrunk && !ornamentOnly) {
      // === Continue growing trunk ===
      const anchor = chooseTreeAnchor(state.treeAnchors, 'trunk', seed);
      const angle = -Math.PI / 2 + (seed - 0.5) * 0.20;
      const length = 0.035 + velocity * 0.06;
      const endX = clamp(anchor.x + Math.cos(angle) * length * 0.42, 0.18, 0.82);
      const endY = clamp(anchor.y + Math.sin(angle) * length, 0.06, 0.92);
      state.treeSegments.push({
        id: `tree-${note.id}`,
        startX: anchor.x, startY: anchor.y, endX, endY,
        thickness: 4 + velocity * 5,
        hue: 30 + seed * 12,
        createdAt: note.createdAt,
        kind: 'trunk',
        swayOffset: seed * Math.PI * 2,
        swaySpeed: 0.7 + seed * 0.4,
      });
      state.treeAnchors.push({
        x: endX, y: endY, angle, depth: anchor.depth + 1, kind: 'trunk',
        strength: clamp(anchor.strength * 0.95 + velocity * 0.1, 0.3, 1.4),
        branchDepth: 0,
      });

    } else if (!ornamentOnly) {
      // === Grow a branch ===
      const side = state.treeNextBranchSide;
      state.treeNextBranchSide = 1 - state.treeNextBranchSide;

      // Determine allowed branch depth based on how many branches already exist
      const depth1Branches = branchAnchors.filter((a) => a.branchDepth === 1).length;
      const depth2Branches = branchAnchors.filter((a) => a.branchDepth === 2).length;
      let targetParentDepth = 0; // attach to trunk by default
      if (depth1Branches >= 6 && seed < 0.55) {
        targetParentDepth = 1; // sub-branch off a primary branch
      }
      if (depth2Branches >= 4 && seed < 0.3) {
        targetParentDepth = 2; // sub-sub-branch
      }
      targetParentDepth = Math.min(targetParentDepth, 2);

      const parentKind = targetParentDepth === 0 ? 'trunk' : 'branch';
      const anchor = chooseTreeAnchorByDepth(state.treeAnchors, parentKind, targetParentDepth, seed);
      const newBranchDepth = Math.min((anchor.branchDepth ?? 0) + 1, 3);

      // Angle radiates outward from trunk with natural spread
      const branchSpread = 0.55 + seed * 0.35;
      const angle = -Math.PI / 2 + (side === 0 ? -branchSpread : branchSpread) + (seed - 0.5) * 0.15;

      // Scale size by branch depth
      const depthFactor = [1, 0.8, 0.6, 0.45][newBranchDepth] ?? 0.45;
      const length = (0.035 + velocity * 0.07) * depthFactor;
      const thickness = (3 + velocity * 4) * depthFactor;

      const endX = clamp(anchor.x + Math.cos(angle) * length, 0.06, 0.94);
      const endY = clamp(anchor.y + Math.sin(angle) * length, 0.06, 0.92);

      // Branch hue -- clearly separated from trunk brown, pitch-mapped
      const lane = clamp((note.midi - 21) / 87, 0, 1);
      const branchHue = (
        lane < 0.33 ? 80 + seed * 30
        : lane < 0.66 ? 140 + seed * 40
        : 260 + seed * 50
      ) + newBranchDepth * 15;

      state.treeSegments.push({
        id: `tree-${note.id}`,
        startX: anchor.x, startY: anchor.y, endX, endY,
        thickness,
        hue: branchHue % 360,
        createdAt: note.createdAt,
        kind: 'branch',
        swayOffset: seed * Math.PI * 2,
        swaySpeed: 1.1 + seed * 1.2,
      });
      state.treeAnchors.push({
        x: endX, y: endY, angle, depth: anchor.depth + 1, kind: 'branch',
        strength: clamp(anchor.strength * 0.9 + velocity * 0.16, 0.22, 1.2),
        branchDepth: newBranchDepth,
      });

      // Add ornament at branch tip
      if (velocity > 0.45) {
        const orn = pickOrnament(note.id, endX, endY, velocity, seed);
        state.treeOrnaments.push(orn);
      }

    } else {
      // === Ornament-only notes ===
      const anchor = chooseTreeAnchor(
        state.treeAnchors,
        branchAnchors.length > 0 ? 'branch' : 'trunk',
        seed,
      );
      const ox = clamp(anchor.x + (seed - 0.5) * 0.06, 0.08, 0.92);
      const oy = clamp(anchor.y + (seededUnit(note.id, 7) - 0.6) * 0.05, 0.08, 0.88);
      const orn = pickOrnament(`extra-${note.id}`, ox, oy, velocity, seed);
      orn.radius = 4 + velocity * 8; // extra ornaments are larger
      state.treeOrnaments.push(orn);
    }
  }

  state.treeGlow = clamp(state.treeGlow + note.velocity * 0.22, 0, 1.5);
}

function addGalaxyBurst(state: SceneState, note: FreePlayVisualNote, props: FreePlayCanvasSceneProps): void {
  state.galaxySpinBoost = clamp(state.galaxySpinBoost + note.velocity * 0.012, 0, 0.06);
  const baseSeed = seededUnit(note.id, 20);
  const pitchRatio = clamp((note.midi - state.adaptiveMin) / Math.max(1, state.adaptiveMax - state.adaptiveMin), 0, 1);
  const baseRadiusRatio = clamp(0.10 + pitchRatio * 0.55 + (baseSeed - 0.5) * 0.08, 0.08, 0.72);
  const armCount = props.activeNotes.length >= 3 ? 4 : 3;
  const particleCount = Math.round(10 + note.velocity * 20 + Math.max(0, props.activeNotes.length - 1) * 5);
  for (let index = 0; index < particleCount; index += 1) {
    const particleId = `${note.id}-galaxy-${index}`;
    const seed = seededUnit(particleId, 1);
    const arm = index % armCount;
    state.galaxyParticles.push({
      id: particleId,
      arm,
      angle: seed * Math.PI * 2 + arm * ((Math.PI * 2) / armCount),
      baseRadiusRatio,
      radiusRatio: Math.max(0.04, baseRadiusRatio * (0.45 + seed * 0.75)),
      targetRadiusRatio: baseRadiusRatio * (0.90 + seed * 0.22),
      spin: 0.0005 + note.velocity * 0.0013 + seed * 0.0006,
      size: 1.4 + note.velocity * 3.1 + seed * 1.2,
      hue: (midiToHue(note.midi) + seed * 26) % 360,
      alpha: 0.35 + note.velocity * 0.45,
      createdAt: note.createdAt,
      sparkle: seed * Math.PI * 2,
    });
  }
}

function auroraHueForNote(midi: number, register: NoteRegister, id: string): number {
  const seed = seededUnit(id, 9);
  if (register === 'low') {
    return 132 + seed * 74;
  }
  if (register === 'mid') {
    return 188 + seed * 72;
  }
  return 300 + seed * 28;
}

function addAuroraRibbon(state: SceneState, note: FreePlayVisualNote): void {
  const register = classifyNoteRegister(note.midi);
  const seed = seededUnit(note.id, 10);
  const lane = adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax);
  const baseY =
    register === 'low'
      ? lerp(0.7, 0.86, 1 - lane * 0.6)
      : register === 'mid'
        ? lerp(0.45, 0.7, 1 - lane * 0.4)
        : lerp(0.18, 0.42, 1 - lane * 0.25);

  state.auroraBands.push({
    id: note.id,
    register,
    hue: auroraHueForNote(note.midi, register, note.id),
    baseY,
    amplitude: 18 + note.velocity * 16,
    targetAmplitude: 26 + note.velocity * 44,
    thickness: register === 'low' ? 30 + note.velocity * 30 : register === 'mid' ? 24 + note.velocity * 26 : 18 + note.velocity * 22,
    speed: register === 'low' ? 0.0008 + seed * 0.0006 : register === 'mid' ? 0.0011 + seed * 0.0008 : 0.0018 + seed * 0.0011,
    phase: seed * Math.PI * 2,
    alpha: 0.22 + note.velocity * 0.34,
    shimmer: seededUnit(note.id, 11) * Math.PI * 2,
    createdAt: note.createdAt,
    lastHitAt: note.createdAt,
  });
  state.auroraEnergy = clamp(state.auroraEnergy + note.velocity * 0.18, 0, 1.5);
}

function launchFireworkShells(state: SceneState, note: FreePlayVisualNote, props: FreePlayCanvasSceneProps): void {
  const lane = adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax);
  const polyphony = props.activeNotes.length;
  const harmony = state.lastHarmony;

  // 3+ simultaneous notes with strong harmony → single mega-shell
  if (polyphony >= 3 && harmony > 0.6) {
    state.fireworkShells.push({
      id: `${note.id}-mega`,
      midi: note.midi,
      x: clamp(0.08 + lane * 0.84, 0.08, 0.92),
      y: 1.02,
      targetY: clamp(lerp(0.72, 0.15, lane), 0.1, 0.72),
      vy: 0.48 + note.velocity * 0.22,
      hue: (midiToHue(note.midi) + 15) % 360,
      size: 3.5 + note.velocity * 2.5,
      burstCount: Math.round(30 + polyphony * 12 + note.velocity * 20),
      createdAt: note.createdAt,
      trail: [],
    });
    return;
  }

  const shellCount = clamp(polyphony >= 3 ? 3 : polyphony >= 2 ? 2 : 1, 1, 3);
  for (let index = 0; index < shellCount; index += 1) {
    state.fireworkShells.push({
      id: `${note.id}-shell-${index}`,
      midi: note.midi,
      x: clamp(0.08 + lane * 0.84 + (index - (shellCount - 1) / 2) * 0.05, 0.08, 0.92),
      y: 1.02,
      targetY: clamp(
        lerp(0.78, 0.22, lane)
          + (seededUnit(`${note.id}-shell-${index}`, 19) - 0.5) * 0.32
          - index * 0.025,
        0.05,
        0.90,
      ),
      vy: 0.34 + note.velocity * 0.26 + index * 0.02,
      hue: (midiToHue(note.midi) + index * 22) % 360,
      size: 2 + note.velocity * 3,
      burstCount: Math.round(18 + note.velocity * 30 + index * 8),
      createdAt: note.createdAt,
      trail: [],
    });
  }
}

function syncSceneState(state: SceneState, props: FreePlayCanvasSceneProps, now: number): void {
  const newNotes = props.recentNotes.filter((note) => !state.processedNoteIds.has(note.id));
  for (const note of newNotes) {
    state.processedNoteIds.add(note.id);
    state.processedOrder.push(note.id);

    const event: RollingNoteEvent = {
      id: note.id,
      midi: note.midi,
      velocity: note.velocity,
      createdAt: note.createdAt,
    };
    state.noteHistory.push(event);
    const existing = state.repeatedStats.get(note.midi);
    const streak = existing && note.createdAt - existing.lastHitAt <= 1800 ? existing.streak + 1 : 1;
    state.repeatedStats = new Map(state.repeatedStats);
    state.repeatedStats.set(note.midi, {
      hits: (existing?.hits ?? 0) + 1,
      streak,
      lastHitAt: note.createdAt,
      peakVelocity: Math.max(existing?.peakVelocity ?? 0, note.velocity),
    });
    state.heatValues = applyNoteToHeatmap(state.heatValues, note.midi, note.velocity);

    state.stageBursts.push({
      id: note.id,
      midi: note.midi,
      velocity: note.velocity,
      hue: midiToHue(note.midi),
      createdAt: note.createdAt,
    });
    state.ribbons.push({
      id: note.id,
      midi: note.midi,
      hue: midiToHue(note.midi),
      velocity: note.velocity,
      createdAt: note.createdAt,
    });

    const stats = state.repeatedStats.get(note.midi);
    const existingBody = state.orbitBodies.find((body) => body.midi === note.midi);
    if (existingBody) {
      existingBody.radiusTarget = clamp(9 + (stats?.streak ?? 1) * 2.4, 9, 28);
      existingBody.lastHitAt = note.createdAt;
      existingBody.mass = 1 + (stats?.hits ?? 1) * 0.03;
      existingBody.angularVelocity += (note.velocity - 0.45) * 0.004;
    } else {
      const lane = adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax);
      const semiMajor = 80 + lane * 260;
      state.orbitBodies.push({
        id: note.id,
        midi: note.midi,
        hue: midiToHue(note.midi),
        angle: lane * Math.PI * 2,
        angularVelocity: (0.002 + note.velocity * 0.0035) * (note.midi % 2 === 0 ? 1 : -1),
        semiMajor,
        semiMinor: semiMajor * (0.56 + ((note.midi % 7) / 20)),
        radius: 8,
        radiusTarget: clamp(10 + (stats?.streak ?? 1) * 2.4, 10, 28),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        mass: 1 + (stats?.hits ?? 1) * 0.03,
        lastHitAt: note.createdAt,
        trail: [],
      });
    }

    const motif = selectConstellationMotif([...state.noteHistory.slice(-7), event]);
    const motifIndex = state.stars.length % motif.anchors.length;
    const motifCycle = Math.floor(state.stars.length / motif.anchors.length);
    const anchor = motif.anchors[motifIndex];
    const lane = adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax);
    const x = clamp(anchor.x + (lane - 0.5) * 0.14 + (motifCycle % 4) * 0.02 - 0.03, 0.08, 0.92);
    const y = clamp(anchor.y + ((note.midi % 5) - 2) * 0.02 - (motifCycle % 3) * 0.03, 0.12, 0.84);
    const starId = `star-${note.id}`;
    state.stars.push({
      id: starId,
      midi: note.midi,
      x,
      y,
      hue: midiToHue(note.midi),
      radius: 2.4 + note.velocity * 2.8,
      createdAt: note.createdAt,
      twinkleOffset: state.stars.length * 0.37,
    });
    if (motifIndex === motif.anchors.length - 1) {
      const starIds = state.stars.slice(-motif.anchors.length).map((star) => star.id);
      state.constellationPaths.push({
        id: `path-${note.id}`,
        starIds,
        hue: midiToHue(note.midi),
        createdAt: note.createdAt,
      });
    }

    if (note.velocity >= 0.9) {
      state.shootingStars.push({
        id: `shoot-${note.id}`,
        x: clamp(x + 0.08, 0.2, 0.92),
        y: clamp(y - 0.1, 0.08, 0.66),
        vx: -0.00034 * (240 + note.velocity * 200),
        vy: 0.00018 * (180 + note.velocity * 120),
        createdAt: note.createdAt,
        lifeMs: 900,
      });
    }

    state.pageFlutter = clamp(state.pageFlutter + note.velocity * 0.35, 0, 1.4);
    addInkBloom(state, note);
    addTreeGrowth(state, note);
    addGalaxyBurst(state, note, props);
    addAuroraRibbon(state, note);
    launchFireworkShells(state, note, props);

    if (props.mode === 'bubble-pop') {
      const hue = (note.midi % 12) * 30;
      const spawnCount = props.sustainOn ? 2 : 1;
      for (let bi = 0; bi < spawnCount; bi++) {
        const xOffset = bi === 0 ? 0 : (Math.random() - 0.5) * 0.06;
        const baseVy = -(0.00028 + note.velocity * 0.00022 + Math.random() * 0.00012);
        const id = bi === 0 ? note.id : `${note.id}-s${bi}`;
        state.bubbles.push({
          id,
          midi: note.midi,
          x: clamp((note.midi - 21) / 87 + xOffset, 0.02, 0.98),
          y: 0.96,
          radius: (12 + note.velocity * 30) * (bi === 0 ? 1 : 0.7),
          hue: (hue + bi * 15) % 360,
          vx: (Math.random() - 0.5) * 0.00004,
          vy: baseVy,
          baseVy,
          wobblePhase: Math.random() * Math.PI * 2,
          createdAt: note.createdAt,
          lifetime: 2800 + Math.random() * 600,
          popThreshold: Math.random() * 0.67,
        });
      }
      if (state.bubbles.length > 80) state.bubbles.splice(0, state.bubbles.length - 80);
    }

    const pitchClass = note.midi % 12;
    for (const ring of state.geometryRings) {
      if (ring.midi % 12 === pitchClass) {
        ring.targetRadius = Math.min(ring.targetRadius + 4, 180);
      }
    }
    state.geometryRings.push({
      id: note.id,
      midi: note.midi,
      hue: midiToHue(note.midi),
      x: adaptiveLaneRatio(note.midi, state.adaptiveMin, state.adaptiveMax),
      y: clamp(
        (classifyNoteRegister(note.midi) === 'low' ? 0.72 : classifyNoteRegister(note.midi) === 'mid' ? 0.47 : 0.22)
          + (seededUnit(note.id, 22) - 0.5) * 0.28,
        0.06,
        0.92,
      ),
      sides: 3 + (note.midi % 12),
      radius: 0,
      targetRadius: 30 + note.velocity * 90,
      rotation: seededUnit(note.id, 9) * Math.PI * 2,
      rotationSpeed: (note.velocity * 0.0012 + 0.0002) * (note.midi % 2 === 0 ? 1 : -1),
      alpha: 0.7 + note.velocity * 0.3,
      createdAt: note.createdAt,
    });
  }

  if (props.metronomeEnabled && props.metronomeBeat !== state.lastMetronomeBeat) {
    state.metronomePulses.push({ createdAt: now });
  }
  state.lastMetronomeBeat = props.metronomeEnabled ? props.metronomeBeat : 0;
}

function updateGenerativeModes(
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
  deltaMs: number,
  intensity: number,
  harmony: number,
  silence: number,
): void {
  if (props.sustainOn && !state.lastSustainOn) {
    state.galaxySupernova = Math.max(state.galaxySupernova, 1);
  }
  state.lastSustainOn = props.sustainOn;

  for (const blob of state.inkBlobs) {
    blob.radius = lerp(blob.radius, blob.targetRadius, blob.spreadRate);
    blob.x = clamp(blob.x + blob.driftX * deltaMs, 0.05, 0.95);
    blob.y = clamp(blob.y + blob.driftY * deltaMs, 0.08, 0.92);
    blob.targetRadius *= 0.9994;
    blob.alpha *= 0.9992 - silence * 0.0002;
  }

  state.treeGlow = lerp(state.treeGlow, intensity * 0.4 + harmony * 0.28, 0.035);

  const sustainAndHarmony = props.sustainOn && harmony > 0.65;
  state.galaxySupernova = lerp(state.galaxySupernova, sustainAndHarmony ? 1.0 : props.sustainOn ? 0.6 : 0, props.sustainOn ? 0.04 : 0.018);
  state.galaxySpinBoost = lerp(state.galaxySpinBoost, 0, 0.022);
  for (const particle of state.galaxyParticles) {
    particle.targetRadiusRatio = particle.baseRadiusRatio * (1 + state.galaxySupernova * 0.9);
    particle.radiusRatio = lerp(particle.radiusRatio, particle.targetRadiusRatio, 0.045);
    particle.angle += (particle.spin + state.galaxySpinBoost) * deltaMs * (1 + state.galaxySupernova * 0.3);
    particle.alpha *= 0.9994;
  }

  state.auroraEnergy = lerp(state.auroraEnergy, harmony * 0.95 + intensity * 0.3, props.activeNotes.length > 0 ? 0.08 : 0.022);
  for (const band of state.auroraBands) {
    const lift = band.register === 'high' ? 1.2 : band.register === 'mid' ? 1 : 0.85;
    band.targetAmplitude = Math.max(
      14,
      band.targetAmplitude * (props.activeNotes.length > 0 ? 0.9988 : 0.9965 - silence * 0.0008),
    );
    band.amplitude = lerp(band.amplitude, band.targetAmplitude * (1 + state.auroraEnergy * 0.4 * lift), 0.04);
    band.phase += band.speed * deltaMs * (1 + state.auroraEnergy * 0.25);
    band.alpha = lerp(band.alpha, Math.max(0.05, band.alpha * (1 - silence * 0.02)), 0.02);
  }

  for (const ring of state.geometryRings) {
    ring.radius = lerp(ring.radius, ring.targetRadius * (1 + state.sustainEnvelope * 0.35), 0.04);
    ring.rotation += ring.rotationSpeed * deltaMs;
    ring.alpha *= 1 - deltaMs * 0.000045;
  }

  state.skyWarmth = lerp(state.skyWarmth, clamp(intensity * 0.7 + harmony * 0.5, 0, 1), 0.03);
  for (const shell of state.fireworkShells) {
    shell.y -= shell.vy * (deltaMs / 1000);
    shell.trail.push({ x: shell.x, y: shell.y, createdAt: now });
    shell.trail = shell.trail.filter((point) => now - point.createdAt <= 600);
  }

  const explodedShells = state.fireworkShells.filter((shell) => shell.y <= shell.targetY);
  if (explodedShells.length > 0) {
    state.lastFireworkFlashAt = now;
  }
  for (const shell of explodedShells) {
    for (let index = 0; index < shell.burstCount; index += 1) {
      const angle = (Math.PI * 2 * index) / shell.burstCount + seededUnit(`${shell.id}-${index}`, 12) * 0.2;
      const speed = 0.06 + seededUnit(`${shell.id}-${index}`, 13) * 0.14 + shell.size * 0.004;
      state.fireworkParticles.push({
        id: `${shell.id}-particle-${index}`,
        x: shell.x,
        y: shell.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.02,
        hue: (shell.hue + index * 7) % 360,
        size: 1.6 + seededUnit(`${shell.id}-${index}`, 14) * (2.4 + shell.size * 0.8),
        alpha: 0.56 + seededUnit(`${shell.id}-${index}`, 15) * 0.34,
        drag: 0.986,
        gravity: 0.1 + seededUnit(`${shell.id}-${index}`, 16) * 0.06,
        createdAt: now,
        lifeMs: 900 + ((shell.size - 2) / 3) * 1200 + seededUnit(`${shell.id}-${index}`, 17) * 600,
        sparkle: seededUnit(`${shell.id}-${index}`, 18) * Math.PI * 2,
      });
    }
  }
  state.fireworkShells = state.fireworkShells.filter((shell) => shell.y > shell.targetY);

  for (const particle of state.fireworkParticles) {
    const dt = deltaMs / 1000;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(particle.drag, dt * 60);
    particle.vy = particle.vy * Math.pow(particle.drag, dt * 60) + particle.gravity * dt;
    particle.alpha *= 0.992;
  }

  const BUBBLE_HOLD_THRESHOLD_MS = 350;
  const sustainSlow = props.sustainOn ? 0.55 : 1;
  for (const bubble of state.bubbles) {
    // Slow this specific bubble if its key is still held down after the hold threshold
    const keyStillHeld = props.activeNotes.includes(bubble.midi) && (now - bubble.createdAt) >= BUBBLE_HOLD_THRESHOLD_MS;
    const holdSlow = keyStillHeld ? 0.7 : 1;
    bubble.vy = bubble.baseVy * holdSlow * sustainSlow;
    bubble.y += bubble.vy * deltaMs;
    bubble.x += bubble.vx * deltaMs + Math.sin(bubble.wobblePhase + now * 0.002) * 0.00015;
  }
}

function updateDynamics(
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
  deltaMs: number,
  intensity: number,
  harmony: number,
  silence: number,
): void {
  state.sustainEnvelope = lerp(state.sustainEnvelope, props.sustainOn ? 1 : 0, props.sustainOn ? 0.08 : 0.035);
  state.lidAngle = lerp(state.lidAngle, 0.2 + intensity * 0.16, 0.05);
  state.pageFlutter = lerp(state.pageFlutter, 0, 0.045);

  // Adaptive pitch range: expand quickly when new extremes are played, contract slowly when idle
  const recentMidis = state.noteHistory.filter((n) => now - n.createdAt <= 8000).map((n) => n.midi);
  if (recentMidis.length >= 2) {
    const observedMin = Math.min(...recentMidis);
    const observedMax = Math.max(...recentMidis);
    const expandRate = 0.22;
    const contractRate = deltaMs * 0.00014;
    state.adaptiveMin = lerp(state.adaptiveMin, observedMin, state.adaptiveMin > observedMin ? expandRate : contractRate);
    state.adaptiveMax = lerp(state.adaptiveMax, observedMax, state.adaptiveMax < observedMax ? expandRate : contractRate);
    const span = state.adaptiveMax - state.adaptiveMin;
    if (span < 12) {
      const mid = (state.adaptiveMin + state.adaptiveMax) / 2;
      state.adaptiveMin = mid - 6;
      state.adaptiveMax = mid + 6;
    }
  } else {
    state.adaptiveMin = lerp(state.adaptiveMin, 21, deltaMs * 0.00014);
    state.adaptiveMax = lerp(state.adaptiveMax, 108, deltaMs * 0.00014);
  }
  state.starfieldRotation += deltaMs * 0.000012;
  state.heatValues = coolHeatValues(state.heatValues, deltaMs);

  if (now - state.lastHeatRowAt >= 280) {
    state.heatHistory.push({
      createdAt: now,
      values: buildHeatHistoryRow(state.heatValues),
    });
    state.lastHeatRowAt = now;
  }

  if (state.sustainEnvelope > 0.08 && now - state.lastFogSpawnAt >= 120) {
    state.fogPuffs.push({
      id: `fog-${now}`,
      x: 0.08 + Math.random() * 0.84,
      y: 0.82 + Math.random() * 0.08,
      vx: (Math.random() - 0.5) * 0.00002,
      vy: -(0.00004 + Math.random() * 0.00005),
      radius: 46 + Math.random() * 70,
      createdAt: now,
      lifeMs: 2600 + Math.random() * 1200,
      alpha: 0.06 + state.sustainEnvelope * 0.14,
    });
    state.lastFogSpawnAt = now;
  }

  updateGenerativeModes(state, props, now, deltaMs, intensity, harmony, silence);
}

function drawStageBursts(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bursts: NoteBurst[],
  now: number,
  adaptiveMin: number,
  adaptiveMax: number,
): void {
  for (const burst of bursts) {
    const age = clamp((now - burst.createdAt) / 1800, 0, 1);
    const x = adaptiveLaneRatio(burst.midi, adaptiveMin, adaptiveMax) * width;
    const y = height * (0.72 - age * 0.2);
    const radius = (26 + burst.velocity * 44) * (0.8 + age * 0.8);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hsla(burst.hue, 96, 74, (1 - age) * 0.9));
    gradient.addColorStop(0.6, hsla(burst.hue, 96, 68, (1 - age) * 0.22));
    gradient.addColorStop(1, hsla(burst.hue, 96, 68, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.globalAlpha = (1 - age) * 0.82;
    context.fillStyle = 'rgba(255,255,255,0.9)';
    context.font = '700 12px "Segoe UI", system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(midiToLabel(burst.midi), x, y + 4);
    context.restore();
  }
}

function drawFog(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  fogPuffs: FogPuff[],
  now: number,
  hue: number,
): void {
  for (const puff of fogPuffs) {
    const age = clamp((now - puff.createdAt) / puff.lifeMs, 0, 1);
    const x = puff.x * width + puff.vx * (now - puff.createdAt);
    const y = puff.y * height + puff.vy * (now - puff.createdAt) * height;
    const radius = puff.radius * (1 + age * 0.3);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hsla(hue, 28, 84, puff.alpha * (1 - age)));
    gradient.addColorStop(1, hsla(hue, 28, 84, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGodRays(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  keyHue: number,
  now: number,
): void {
  const sources = [width * 0.28, width * 0.72];
  context.save();
  context.globalCompositeOperation = 'lighter';
  for (const srcX of sources) {
    for (let i = 0; i < 10; i += 1) {
      const baseAngle = Math.PI / 2 + (i - 5) * 0.08 + Math.sin(now * 0.0003 + i * 0.7) * 0.06;
      const fanLeft = baseAngle - 0.018;
      const fanRight = baseAngle + 0.018;
      const reach = height * (1.0 + intensity * 0.4);
      const rayAlpha = (0.04 + intensity * 0.1) * (0.5 + 0.5 * Math.sin(now * 0.0007 + i * 1.3));
      const gradient = context.createLinearGradient(srcX, 0, srcX + Math.cos(baseAngle) * reach * 0.2, reach);
      gradient.addColorStop(0, hsla(keyHue + i * 8, 88, 80, rayAlpha));
      gradient.addColorStop(1, hsla(keyHue + i * 8, 88, 70, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(srcX, 0);
      context.lineTo(srcX + Math.cos(fanLeft) * reach, Math.sin(fanLeft) * reach);
      context.lineTo(srcX + Math.cos(fanRight) * reach, Math.sin(fanRight) * reach);
      context.closePath();
      context.fill();
    }
  }
  context.restore();
}

function drawConcertStage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
  intensity: number,
  pitchCenter: number,
  keyHue: number,
): void {
  drawBackground(context, width, height, 'rgba(8, 14, 32, 1)', 'rgba(2, 4, 10, 1)');
  drawGodRays(context, width, height, intensity, keyHue, now);

  const sweepBase = now * 0.0012;
  for (let index = 0; index < 4; index += 1) {
    const sourceX = width * (0.14 + index * 0.24);
    const targetX = width * (0.12 + ((Math.sin(sweepBase + index * 0.9) + 1) / 2) * 0.76);
    const coneWidth = 120 + intensity * 160 + index * 14;
    const hue = (keyHue + index * 22 + intensity * 30) % 360;
    const gradient = context.createLinearGradient(sourceX, 0, targetX, height * 0.76);
    gradient.addColorStop(0, hsla(hue, 88, 76, 0.42 + intensity * 0.26));
    gradient.addColorStop(1, hsla(hue, 88, 60, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(sourceX - 18, 0);
    context.lineTo(sourceX + 18, 0);
    context.lineTo(targetX + coneWidth, height * 0.8);
    context.lineTo(targetX - coneWidth, height * 0.8);
    context.closePath();
    context.fill();
  }

  const spotlightX = adaptiveLaneRatio(pitchCenter, state.adaptiveMin, state.adaptiveMax) * width;
  // Warmth offset: lower pitch → warmer (+hue toward orange), higher pitch → cooler (−hue toward blue)
  const pitchWarmthOffset = clamp((60 - pitchCenter) * 0.55, -20, 28);
  const spotlightGradient = context.createRadialGradient(spotlightX, height * 0.63, 0, spotlightX, height * 0.7, 180 + intensity * 150);
  spotlightGradient.addColorStop(0, hsla(keyHue + 24 + pitchWarmthOffset, 94, 78, 0.24 + intensity * 0.18));
  spotlightGradient.addColorStop(1, hsla(keyHue + 24 + pitchWarmthOffset, 94, 78, 0));
  context.fillStyle = spotlightGradient;
  context.fillRect(0, 0, width, height);

  // Warm/cool atmosphere tint from pitch center
  if (Math.abs(pitchWarmthOffset) > 3) {
    const tintGrad = context.createLinearGradient(0, height * 0.35, 0, height * 0.85);
    tintGrad.addColorStop(0, hsla(keyHue + pitchWarmthOffset * 1.2, 72, 56, 0.06 + intensity * 0.04));
    tintGrad.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = tintGrad;
    context.fillRect(0, 0, width, height);
  }

  const floorGradient = context.createRadialGradient(width / 2, height * 0.9, 20, width / 2, height * 0.9, width * 0.55);
  floorGradient.addColorStop(0, 'rgba(255, 148, 94, 0.18)');
  floorGradient.addColorStop(0.55, 'rgba(89, 126, 255, 0.14)');
  floorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = floorGradient;
  context.fillRect(0, height * 0.55, width, height * 0.45);

  drawFog(context, width, height, state.fogPuffs, now, keyHue);
  drawStageBursts(context, width, height, state.stageBursts, now, state.adaptiveMin, state.adaptiveMax);

  const crowdTop = height * (0.88 - intensity * 0.04);
  context.fillStyle = 'rgba(3, 6, 14, 0.96)';
  context.beginPath();
  context.moveTo(0, height);
  context.lineTo(0, crowdTop);
  for (let x = 0; x <= width; x += 24) {
    const wave = Math.sin(x * 0.034 + now * 0.003 + intensity * 4) * (8 + intensity * 12);
    const bob = Math.sin(x * 0.018 + now * 0.0016) * (6 + intensity * 4);
    context.lineTo(x, crowdTop + wave + bob);
  }
  context.lineTo(width, height);
  context.closePath();
  context.fill();

  context.save();
  context.globalAlpha = 0.75;
  context.fillStyle = 'rgba(240, 245, 255, 0.9)';
  context.font = '700 12px "Segoe UI", system-ui, sans-serif';
  context.textAlign = 'left';
  const label = props.activeNotes.slice(-5).map((note) => midiToLabel(note)).join('  ');
  context.fillText(label || 'Stage listening...', 28, height - 30);
  context.restore();
}

function drawClassicPiano(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  drawBackground(context, width, height, '#141a27', '#05070d');
}

function drawColorRibbons(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ribbons: RibbonTrail[],
  now: number,
  keyHue: number,
  adaptiveMin: number,
  adaptiveMax: number,
): void {
  drawBackground(context, width, height, hsla(keyHue - 28, 54, 15, 1), '#050812');

  for (const ribbon of ribbons) {
    const age = clamp((now - ribbon.createdAt) / 3600, 0, 1);
    const x = adaptiveLaneRatio(ribbon.midi, adaptiveMin, adaptiveMax) * width;
    const widthScale = 18 + ribbon.velocity * 38;
    const sway = Math.sin((now - ribbon.createdAt) * 0.003 + ribbon.midi * 0.2) * 24;

    // Pulse restroke: brief wide glow behind fresh ribbons (< 380ms)
    const pulseAge = clamp((now - ribbon.createdAt) / 380, 0, 1);
    if (pulseAge < 1) {
      const pulseAlpha = (1 - pulseAge) * (0.12 + ribbon.velocity * 0.10);
      const pulseGrad = context.createLinearGradient(x, 0, x + sway, height);
      pulseGrad.addColorStop(0, hsla(ribbon.hue, 88, 78, 0));
      pulseGrad.addColorStop(0.3, hsla(ribbon.hue, 88, 78, pulseAlpha));
      pulseGrad.addColorStop(1, hsla(ribbon.hue, 88, 78, 0));
      context.strokeStyle = pulseGrad;
      context.lineWidth = (widthScale + ribbon.velocity * 22) * 1.6;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(x, height * 1.08);
      context.bezierCurveTo(x + sway * 0.25, height * 0.7, x + sway * 0.8, height * 0.34, x + sway, -height * 0.08);
      context.stroke();
    }

    const gradient = context.createLinearGradient(x, 0, x + sway, height);
    gradient.addColorStop(0, hsla(ribbon.hue, 92, 74, 0));
    gradient.addColorStop(0.24, hsla(ribbon.hue, 92, 74, (1 - age) * 0.72));
    gradient.addColorStop(0.75, hsla((ribbon.hue + 18) % 360, 92, 62, (1 - age) * 0.22));
    gradient.addColorStop(1, hsla(ribbon.hue, 92, 74, 0));
    context.strokeStyle = gradient;
    context.lineWidth = widthScale * (1 - age * 0.32);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(x, height * 1.08);
    context.bezierCurveTo(x + sway * 0.25, height * 0.7, x + sway * 0.8, height * 0.34, x + sway, -height * 0.08);
    context.stroke();
  }
}

function updateOrbitBodies(
  orbitBodies: OrbitBody[],
  width: number,
  height: number,
  now: number,
  deltaMs: number,
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  for (const body of orbitBodies) {
    body.radius = lerp(body.radius, body.radiusTarget, 0.08);
    body.angularVelocity *= 0.999;
    body.angle += body.angularVelocity * deltaMs;
    const prevX = body.x;
    const prevY = body.y;
    body.x = centerX + Math.cos(body.angle) * body.semiMajor;
    body.y = centerY + Math.sin(body.angle) * body.semiMinor;
    body.vx = body.x - prevX;
    body.vy = body.y - prevY;
  }

  for (let index = 0; index < orbitBodies.length; index += 1) {
    for (let inner = index + 1; inner < orbitBodies.length; inner += 1) {
      const left = orbitBodies[index];
      const right = orbitBodies[inner];
      const dx = right.x - left.x;
      const distanceSquared = Math.max(1200, dx * dx + (right.y - left.y) * (right.y - left.y));
      const pull = (left.mass + right.mass) / distanceSquared;
      left.angularVelocity += pull * 0.0022 * Math.sign(dx || 1);
      right.angularVelocity -= pull * 0.0022 * Math.sign(dx || 1);
    }
  }

  for (const body of orbitBodies) {
    body.trail.push({ x: body.x, y: body.y, createdAt: now });
    body.trail = body.trail.filter((point) => now - point.createdAt <= 2000);
    body.radiusTarget = Math.max(8, body.radiusTarget * 0.9992);
  }
}

function drawPulseOrbit(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
  deltaMs: number,
  keyHue: number,
): void {
  drawBackground(context, width, height, '#09111f', '#03070f');
  const centerX = width / 2;
  const centerY = height / 2;
  const ringGradient = context.createRadialGradient(centerX, centerY, 12, centerX, centerY, Math.min(width, height) * 0.4);
  ringGradient.addColorStop(0, hsla(keyHue + 24, 88, 70, 0.2));
  ringGradient.addColorStop(1, hsla(keyHue + 24, 88, 70, 0));
  context.fillStyle = ringGradient;
  context.fillRect(0, 0, width, height);

  for (const scale of [0.22, 0.34, 0.48]) {
    context.strokeStyle = 'rgba(164, 190, 255, 0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(centerX, centerY, width * scale, height * (scale * 0.62), 0, 0, Math.PI * 2);
    context.stroke();
  }

  updateOrbitBodies(state.orbitBodies, width, height, now, deltaMs);

  for (const body of state.orbitBodies) {
    for (let index = 1; index < body.trail.length; index += 1) {
      const previous = body.trail[index - 1];
      const current = body.trail[index];
      const alpha = index / body.trail.length;
      context.strokeStyle = hsla(body.hue, 92, 70, alpha * 0.18);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.stroke();
    }
  }

  const coreGradient = context.createRadialGradient(centerX, centerY, 10, centerX, centerY, 90);
  coreGradient.addColorStop(0, 'rgba(255, 188, 98, 0.9)');
  coreGradient.addColorStop(0.45, hsla(keyHue + 40, 88, 72, 0.34));
  coreGradient.addColorStop(1, 'rgba(109, 149, 255, 0)');
  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(centerX, centerY, 90, 0, Math.PI * 2);
  context.fill();

  // Close-pass lens accents between nearby bodies
  for (let index = 0; index < state.orbitBodies.length; index += 1) {
    for (let inner = index + 1; inner < state.orbitBodies.length; inner += 1) {
      const left = state.orbitBodies[index];
      const right = state.orbitBodies[inner];
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = (left.radius + right.radius) * 5.5;
      if (dist < threshold && dist > 1) {
        const proximity = 1 - dist / threshold;
        const midX = (left.x + right.x) / 2;
        const midY = (left.y + right.y) / 2;
        const accentHue = (left.hue + right.hue) / 2;
        context.strokeStyle = hsla(accentHue, 88, 82, proximity * 0.28);
        context.lineWidth = proximity * 2.2;
        context.beginPath();
        context.moveTo(left.x, left.y);
        context.lineTo(right.x, right.y);
        context.stroke();
        drawSoftGlow(context, midX, midY, dist * 0.3 + 12, accentHue, proximity * 0.14);
      }
    }
  }

  for (const body of state.orbitBodies) {
    context.fillStyle = hsla(body.hue, 92, 70, 0.9);
    context.beginPath();
    context.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(8, 14, 26, 0.72)';
    context.beginPath();
    context.arc(body.x - body.radius * 0.24, body.y - body.radius * 0.22, body.radius * 0.38, 0, Math.PI * 2);
    context.fill();

    if (props.activeNotes.includes(body.midi)) {
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(body.x, body.y, body.radius + 5, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = 'rgba(245, 248, 255, 0.92)';
    context.font = '700 11px "Segoe UI", system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(pitchClassLabel(body.midi % 12), body.x, body.y + 4);
  }
}

function drawConstellation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
  intensity: number,
  keyHue: number,
  sustainOn: boolean,
): void {
  drawBackground(context, width, height, '#08101f', '#02050d');

  // Primary nebula (hue-reactive)
  const nebulaGradient = context.createRadialGradient(width * 0.25, height * 0.22, 10, width * 0.25, height * 0.22, width * 0.36);
  nebulaGradient.addColorStop(0, hsla(keyHue, 82, 60, 0.18 + intensity * 0.14));
  nebulaGradient.addColorStop(0.65, hsla((keyHue + 70) % 360, 72, 52, 0.08));
  nebulaGradient.addColorStop(1, hsla(keyHue, 82, 60, 0));
  context.fillStyle = nebulaGradient;
  context.fillRect(0, 0, width, height);

  // Secondary hue-reactive nebula clouds — low-alpha, slow drift
  const nebulaDrift = now * 0.000018;
  const nebulaClouds = [
    { cx: 0.68 + Math.sin(nebulaDrift) * 0.04, cy: 0.34 + Math.cos(nebulaDrift * 0.7) * 0.03, r: 0.28, hueShift: 130, alpha: 0.07 + intensity * 0.05 },
    { cx: 0.42 + Math.sin(nebulaDrift * 1.3 + 1.2) * 0.03, cy: 0.64 + Math.cos(nebulaDrift * 0.9) * 0.025, r: 0.22, hueShift: 220, alpha: 0.06 + intensity * 0.04 },
  ];
  for (const cloud of nebulaClouds) {
    const cx = cloud.cx * width;
    const cy = cloud.cy * height;
    const r = cloud.r * Math.min(width, height);
    const cloudGrad = context.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    cloudGrad.addColorStop(0, hsla((keyHue + cloud.hueShift) % 360, 68, 52, cloud.alpha));
    cloudGrad.addColorStop(1, hsla((keyHue + cloud.hueShift) % 360, 68, 52, 0));
    context.fillStyle = cloudGrad;
    context.fillRect(0, 0, width, height);
  }

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(state.starfieldRotation);
  context.translate(-width / 2, -height / 2);

  for (const star of state.stars) {
    const ageSec = (now - star.createdAt) / 1000;
    const twinkle = 0.5 + (Math.sin(ageSec * 1.7 + star.twinkleOffset) + 1) * 0.25;
    const x = star.x * width;
    const y = star.y * height;
    const radius = star.radius * (0.9 + twinkle * 0.35);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 4);
    gradient.addColorStop(0, hsla(star.hue, 96, 84, 0.95));
    gradient.addColorStop(0.35, hsla(star.hue, 96, 78, 0.3 + twinkle * 0.2));
    gradient.addColorStop(1, hsla(star.hue, 96, 78, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius * 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.92)';
    context.beginPath();
    context.arc(x, y, Math.max(1.5, radius * 0.8), 0, Math.PI * 2);
    context.fill();
  }

  const sustainBoost = sustainOn ? 0.28 : 0;
  for (const path of state.constellationPaths) {
    const age = clamp((now - path.createdAt) / 16000, 0, 1);
    const points = path.starIds
      .map((starId) => state.stars.find((star) => star.id === starId))
      .filter((star): star is StarNode => Boolean(star));
    if (points.length < 2) {
      continue;
    }
    context.strokeStyle = hsla(path.hue, 88, 72, clamp(0.18 + (1 - age) * 0.34 + sustainBoost, 0, 0.82));
    context.lineWidth = sustainOn ? 2.2 : 1.4;
    context.beginPath();
    context.moveTo(points[0].x * width, points[0].y * height);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x * width, points[index].y * height);
    }
    context.stroke();
  }
  context.restore();

  for (const shooting of state.shootingStars) {
    const age = clamp((now - shooting.createdAt) / shooting.lifeMs, 0, 1);
    const x = shooting.x * width + shooting.vx * (now - shooting.createdAt);
    const y = shooting.y * height + shooting.vy * (now - shooting.createdAt);
    const tailX = x - shooting.vx * 220;
    const tailY = y - shooting.vy * 220;
    const gradient = context.createLinearGradient(x, y, tailX, tailY);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.strokeStyle = gradient;
    context.lineWidth = 2.6 * (1 - age * 0.4);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(tailX, tailY);
    context.stroke();
  }
}

function drawHeatmap(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  keyHue: number,
  now: number,
): void {
  drawBackground(context, width, height, '#0b1221', '#03070f');

  const padding = { top: 70, right: 26, bottom: 30, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rows = state.heatHistory;
  const cellWidth = plotWidth / 88;
  const rowHeight = Math.max(1.5, plotHeight / Math.max(rows.length, 1));

  // Compute peaks early so they can be used for both background glow and labels
  const peaks = findPeakHeatZones(state.heatValues);

  context.fillStyle = 'rgba(255,255,255,0.9)';
  context.font = '700 12px "Segoe UI", system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText('Session Heatmap', padding.left, 36);

  context.strokeStyle = 'rgba(149, 174, 231, 0.08)';
  context.lineWidth = 1;
  for (let index = 0; index <= 88; index += 11) {
    const x = padding.left + index * cellWidth;
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + plotHeight);
    context.stroke();
  }

  // Gentle peak-zone glow/pulse behind heatmap cells — keeps analytical readability as priority
  peaks.forEach((peak, index) => {
    const zoneX = padding.left + (peak.startMidi - 21) * cellWidth;
    const zoneW = (peak.endMidi - peak.startMidi + 1) * cellWidth;
    const pulse = (Math.sin(now * 0.0022 + index * 1.9) + 1) * 0.5;
    const glowAlpha = clamp(0.03 + pulse * 0.04 * clamp(peak.score, 0, 1), 0, 0.08);
    const glowHue = (keyHue + index * 36) % 360;
    const zoneGrad = context.createLinearGradient(zoneX, padding.top, zoneX, padding.top + plotHeight);
    zoneGrad.addColorStop(0, hsla(glowHue, 80, 60, glowAlpha));
    zoneGrad.addColorStop(0.55, hsla(glowHue, 80, 60, glowAlpha * 0.5));
    zoneGrad.addColorStop(1, hsla(glowHue, 80, 60, 0));
    context.fillStyle = zoneGrad;
    context.fillRect(zoneX, padding.top, Math.max(2, zoneW), plotHeight);
  });

  rows.forEach((row, rowIndex) => {
    const y = padding.top + plotHeight - (rowIndex + 1) * rowHeight;
    row.values.forEach((value, noteIndex) => {
      if (value <= 0.01) {
        return;
      }
      const hue = (keyHue + noteIndex * 1.8) % 360;
      context.fillStyle = hsla(hue, 92, 62, clamp(value * 0.8, 0.04, 0.86));
      context.fillRect(padding.left + noteIndex * cellWidth, y, Math.max(1.2, cellWidth + 0.5), rowHeight + 0.6);
    });
  });

  for (const active of props.activeNotes) {
    const x = padding.left + (active - 21) * cellWidth;
    context.fillStyle = 'rgba(255, 255, 255, 0.82)';
    context.fillRect(x, padding.top, Math.max(1.4, cellWidth), plotHeight);
  }

  peaks.forEach((peak, index) => {
    const x = padding.left + (peak.startMidi - 21) * cellWidth;
    context.fillStyle = hsla((keyHue + index * 36) % 360, 90, 74, 0.88);
    fillRoundedRect(context, x - 8, padding.top - 24, 42, 18, 999);
    context.fill();
    context.fillStyle = 'rgba(8, 14, 24, 0.92)';
    context.font = '700 10px "Segoe UI", system-ui, sans-serif';
    context.fillText(midiToLabel(peak.startMidi), x, padding.top - 11);
  });
}

function drawInkInWater(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
  silence: number,
  sustainOn: boolean,
): void {
  drawBackground(context, width, height, '#eff6fb', '#ccd9e6');

  const currentGradient = context.createLinearGradient(0, 0, width, height);
  currentGradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  currentGradient.addColorStop(0.45, 'rgba(190, 214, 235, 0.18)');
  currentGradient.addColorStop(1, 'rgba(95, 133, 176, 0.12)');
  context.fillStyle = currentGradient;
  context.fillRect(0, 0, width, height);

  for (let stripe = 0; stripe < 7; stripe += 1) {
    const x = ((stripe * 0.16 + now * 0.000015) % 1) * width;
    const gradient = context.createLinearGradient(x, 0, x + width * 0.18, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(x - width * 0.12, 0, width * 0.24, height);
  }

  context.save();
  context.globalCompositeOperation = 'multiply';
  for (const blob of state.inkBlobs) {
    const age = clamp((now - blob.createdAt) / 12000, 0, 1);
    const x = blob.x * width;
    const y = blob.y * height;
    const radius = blob.radius * (1 + age * 1.6);
    const gradient = context.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    gradient.addColorStop(0, hsla(blob.hue, 70, 52, blob.alpha * (1 - age * 0.22)));
    gradient.addColorStop(0.32, hsla(blob.hue + 10, 78, 56, blob.alpha * 0.72));
    gradient.addColorStop(0.72, hsla(blob.hue + 18, 68, 64, blob.alpha * 0.24));
    gradient.addColorStop(1, hsla(blob.hue + 24, 54, 70, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    const bloomRadius = radius * (1.28 + Math.sin((now - blob.createdAt) * 0.002) * 0.08);
    const bloom = context.createRadialGradient(x, y, radius * 0.2, x, y, bloomRadius);
    bloom.addColorStop(0, hsla(blob.hue, 64, 88, blob.alpha * 0.18));
    bloom.addColorStop(1, hsla(blob.hue, 64, 88, 0));
    context.fillStyle = bloom;
    context.beginPath();
    context.arc(x, y, bloomRadius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.22 + (1 - silence) * 0.08;
  for (const blob of state.inkBlobs.slice(-32)) {
    const x = blob.x * width;
    const y = blob.y * height;
    context.strokeStyle = hsla(blob.hue, 74, 92, 0.18);
    context.lineWidth = 1 + blob.radius * 0.015;
    context.beginPath();
    context.arc(x, y, blob.radius * 1.4, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  // Surface-tension shimmer — slow-drifting light caustics, paper-like not neon; doubles on sustain
  context.save();
  const shimmerCount = sustainOn ? 26 : 13;
  const shimmerAlphaBoost = sustainOn ? 2.0 : 1.0;
  for (let s = 0; s < shimmerCount; s += 1) {
    const baseIndex = s % 13;
    const seedX = seededUnit(`ink-shim-${baseIndex}`, 1);
    const seedY = seededUnit(`ink-shim-${baseIndex}`, 2);
    const seedRate = seededUnit(`ink-shim-${baseIndex}`, 3);
    const phaseShift = s >= 13 ? Math.PI : 0;
    const shimX = (seedX + Math.sin(now * 0.000096 * (0.5 + seedRate * 0.8) + baseIndex * 2.1 + phaseShift) * 0.07) * width;
    const shimY = (seedY + Math.cos(now * 0.000078 * (0.4 + seedRate * 0.7) + baseIndex * 2.7 + phaseShift) * 0.055) * height;
    const shimSize = 9 + seededUnit(`ink-shim-${baseIndex}`, 4) * 20;
    const shimAlpha = (Math.sin(now * 0.0014 * (0.6 + seedRate * 0.5) + baseIndex * 3.3) + 1) * 0.5 * 0.048 * shimmerAlphaBoost;
    if (shimAlpha < 0.007) {
      continue;
    }
    const shimGrad = context.createRadialGradient(shimX, shimY, 0, shimX, shimY, shimSize);
    shimGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(shimAlpha, 0.18)})`);
    shimGrad.addColorStop(0.45, `rgba(255, 255, 255, ${Math.min(shimAlpha * 0.35, 0.08)})`);
    shimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = shimGrad;
    context.beginPath();
    context.ellipse(shimX, shimY, shimSize, shimSize * 0.48, now * 0.000072 + s * 0.44, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawTreeOfLight(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
  pitchCenter: number,
  intensity: number,
): void {
  drawBackground(context, width, height, '#08111d', '#010407');

  const moonGlow = context.createRadialGradient(width * 0.76, height * 0.18, 0, width * 0.76, height * 0.18, width * 0.24);
  moonGlow.addColorStop(0, 'rgba(240, 244, 255, 0.28)');
  moonGlow.addColorStop(0.45, 'rgba(139, 174, 255, 0.14)');
  moonGlow.addColorStop(1, 'rgba(139, 174, 255, 0)');
  context.fillStyle = moonGlow;
  context.fillRect(0, 0, width, height);

  const ground = context.createLinearGradient(0, height * 0.78, 0, height);
  ground.addColorStop(0, 'rgba(14, 26, 20, 0.12)');
  ground.addColorStop(1, 'rgba(4, 12, 10, 0.92)');
  context.fillStyle = ground;
  context.fillRect(0, height * 0.78, width, height * 0.22);

  for (const segment of state.treeSegments) {
    const sway = segment.kind === 'branch' ? Math.sin(now * 0.001 * segment.swaySpeed + segment.swayOffset) * 6 : 0;
    const startX = segment.startX * width;
    const startY = segment.startY * height;
    const endX = segment.endX * width + sway;
    const endY = segment.endY * height;
    const controlX = lerp(startX, endX, 0.5) + sway * 0.7;
    const controlY = lerp(startY, endY, 0.52) - (segment.kind === 'root' ? -8 : 10);

    // Bass-centered playing brightens root/trunk segments
    const bassBoost = segment.kind === 'root' || segment.kind === 'trunk'
      ? clamp((55 - pitchCenter) * 0.04, 0, 0.22) * intensity
      : 0;
    const glowAlpha = 0.18 + state.treeGlow * 0.12 + bassBoost;
    const coreL = segment.kind === 'root' ? 28 + bassBoost * 60 : 38;

    // Differentiate trunk (brown) from branches (vibrant) in glow and core layers
    const glowSat = segment.kind === 'root' ? 58 : segment.kind === 'trunk' ? 48 : 72;
    const glowLight = segment.kind === 'root' ? 28 : segment.kind === 'trunk' ? 32 : 52;
    const coreSat = segment.kind === 'root' ? 44 : segment.kind === 'trunk' ? 44 : 78;
    const coreLightFinal = segment.kind === 'root' ? coreL : segment.kind === 'trunk' ? 38 : 62;

    context.strokeStyle = hsla(segment.hue, glowSat, glowLight, glowAlpha);
    context.lineWidth = segment.thickness + 7;
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.stroke();

    context.strokeStyle = hsla(segment.hue, coreSat, coreLightFinal, 0.92);
    context.lineWidth = segment.thickness;
    context.beginPath();
    context.moveTo(startX, startY);
    context.quadraticCurveTo(controlX, controlY, endX, endY);
    context.stroke();
  }

  for (const ornament of state.treeOrnaments) {
    const twinkle = 0.65 + (Math.sin(now * 0.0024 + ornament.shimmer) + 1) * 0.22;
    const driftAmt = ornament.kind === 'leaf' ? 2.5 : 4;
    const x = ornament.x * width + Math.sin(now * 0.0016 + ornament.drift) * driftAmt;
    const y = ornament.y * height + Math.cos(now * 0.0012 + ornament.drift) * 2.2;
    const radius = ornament.radius * twinkle;
    const shape = ornament.shape ?? (ornament.kind === 'leaf' ? 'ellipse' : 'circle');
    const sat = ornament.sat ?? (ornament.kind === 'bloom' ? 94 : 72);
    const light = ornament.light ?? (ornament.kind === 'bloom' ? 74 : 62);

    // Per-shape glow
    const glowRadiusMult = shape === 'star' ? 6 : ornament.kind === 'bloom' ? 5 : shape === 'diamond' ? 4.5 : shape === 'teardrop' ? 4 : 3.5;
    const glowAlpha2 = shape === 'star' ? 0.32 : ornament.kind === 'bloom' ? 0.28 : shape === 'diamond' ? 0.24 : shape === 'teardrop' ? 0.22 : 0.16;
    drawSoftGlow(context, x, y, radius * glowRadiusMult, ornament.hue, glowAlpha2);

    context.fillStyle = hsla(ornament.hue, sat, light, 0.94);
    context.beginPath();

    if (shape === 'ellipse') {
      context.ellipse(x, y, radius, radius * 0.72, 0.6, 0, Math.PI * 2);
      context.fill();
    } else if (shape === 'circle') {
      context.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2);
      context.fill();
    } else if (shape === 'star') {
      const outerR = radius;
      const innerR = radius * 0.45;
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        if (i === 0) context.moveTo(x + Math.cos(outerAngle) * outerR, y + Math.sin(outerAngle) * outerR);
        else context.lineTo(x + Math.cos(outerAngle) * outerR, y + Math.sin(outerAngle) * outerR);
        context.lineTo(x + Math.cos(innerAngle) * innerR, y + Math.sin(innerAngle) * innerR);
      }
      context.closePath();
      context.fill();
    } else if (shape === 'diamond') {
      context.moveTo(x, y - radius);
      context.lineTo(x + radius * 0.7, y);
      context.lineTo(x, y + radius);
      context.lineTo(x - radius * 0.7, y);
      context.closePath();
      context.fill();
    } else if (shape === 'heart') {
      const s = radius * 0.9;
      context.moveTo(x, y + s * 0.7);
      context.bezierCurveTo(x - s * 1.1, y + s * 0.2, x - s * 1.1, y - s * 0.6, x, y - s * 0.1);
      context.bezierCurveTo(x + s * 1.1, y - s * 0.6, x + s * 1.1, y + s * 0.2, x, y + s * 0.7);
      context.fill();
    } else if (shape === 'teardrop') {
      // Circle top, pointed bottom
      context.arc(x, y - radius * 0.3, radius * 0.65, Math.PI, 0);
      context.bezierCurveTo(x + radius * 0.65, y + radius * 0.3, x + radius * 0.25, y + radius * 0.9, x, y + radius);
      context.bezierCurveTo(x - radius * 0.25, y + radius * 0.9, x - radius * 0.65, y + radius * 0.3, x - radius * 0.65, y - radius * 0.3);
      context.closePath();
      context.fill();
    }
  }
}

function drawParticleGalaxy(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
  harmony: number,
): void {
  drawBackground(context, width, height, '#040813', '#010205');
  const centerX = width / 2;
  const centerY = height / 2;
  const minDimension = Math.min(width, height);

  const backdrop = context.createRadialGradient(centerX, centerY, minDimension * 0.02, centerX, centerY, minDimension * 0.7);
  backdrop.addColorStop(0, 'rgba(44, 84, 160, 0.24)');
  backdrop.addColorStop(0.5, 'rgba(28, 18, 66, 0.12)');
  backdrop.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  const nebulaHues = [200, 280, 320, 60];
  for (let n = 0; n < 4; n += 1) {
    const nx = seededUnit(`neb-${n}`, 1) * width;
    const ny = seededUnit(`neb-${n}`, 2) * height;
    const nr = minDimension * (0.18 + seededUnit(`neb-${n}`, 3) * 0.22);
    const nebulaGrad = context.createRadialGradient(nx, ny, 0, nx, ny, nr);
    nebulaGrad.addColorStop(0, hsla(nebulaHues[n], 80, 38, 0.12 + state.galaxySupernova * 0.08));
    nebulaGrad.addColorStop(1, hsla(nebulaHues[n], 70, 30, 0));
    context.fillStyle = nebulaGrad;
    context.fillRect(0, 0, width, height);
  }

  for (let index = 0; index < 120; index += 1) {
    const seed = seededUnit(`galaxy-star-${index}`, 1);
    const starX = seededUnit(`galaxy-star-${index}`, 2) * width;
    const starY = seededUnit(`galaxy-star-${index}`, 3) * height;
    const twinkle = seed * 0.28 + Math.sin(now * 0.0016 * (0.4 + seed * 0.8) + index * 1.7) * 0.12;
    context.fillStyle = `rgba(255,255,255,${Math.max(0, 0.06 + twinkle)})`;
    context.beginPath();
    context.arc(starX, starY, 0.5 + seed * 1.6, 0, Math.PI * 2);
    context.fill();
  }

  for (const particle of state.galaxyParticles) {
    const radius = particle.radiusRatio * minDimension;
    const spiralAngle = particle.angle + particle.arm * ((Math.PI * 2) / 4) + particle.radiusRatio * 7.4;
    const x = centerX + Math.cos(spiralAngle) * radius * 1.12;
    const y = centerY + Math.sin(spiralAngle) * radius * 0.6;
    const tailAngle = spiralAngle - particle.spin * 180;
    const tailRadius = Math.max(0, radius - minDimension * 0.03);
    const tailX = centerX + Math.cos(tailAngle) * tailRadius * 1.08;
    const tailY = centerY + Math.sin(tailAngle) * tailRadius * 0.58;
    const age = clamp((now - particle.createdAt) / 70000, 0, 1);

    // Strengthen spiral-arm tail readability with harmony
    const armAlphaBoost = harmony * 0.10;
    context.strokeStyle = hsla(particle.hue, 88 + harmony * 8, 72, particle.alpha * (1 - age) * (0.12 + armAlphaBoost));
    context.lineWidth = particle.size * (1.6 + harmony * 0.5);
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(x, y);
    context.stroke();

    drawSoftGlow(context, x, y, particle.size * (13 + state.galaxySupernova * 5), particle.hue, particle.alpha * (0.18 + harmony * 0.06));
    context.fillStyle = hsla(particle.hue, 90, 72, particle.alpha * (0.7 + (Math.sin(now * 0.0022 + particle.sparkle) + 1) * 0.15));
    context.beginPath();
    context.arc(x, y, particle.size * (0.8 + state.galaxySupernova * 0.22), 0, Math.PI * 2);
    context.fill();
  }

  if (state.galaxySupernova > 0.4) {
    const flashAlpha = (state.galaxySupernova - 0.4) * 0.55;
    const flash = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minDimension * 0.6);
    flash.addColorStop(0, `rgba(255, 240, 200, ${flashAlpha})`);
    flash.addColorStop(0.5, `rgba(255, 200, 140, ${flashAlpha * 0.4})`);
    flash.addColorStop(1, 'rgba(255, 240, 200, 0)');
    context.fillStyle = flash;
    context.fillRect(0, 0, width, height);
  }

  const coreGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minDimension * 0.16);
  coreGradient.addColorStop(0, 'rgba(255, 236, 182, 0.95)');
  coreGradient.addColorStop(0.25, 'rgba(255, 168, 90, 0.6)');
  coreGradient.addColorStop(0.7, `rgba(126, 174, 255, ${0.18 + state.galaxySupernova * 0.18})`);
  coreGradient.addColorStop(1, 'rgba(126, 174, 255, 0)');
  context.fillStyle = coreGradient;
  context.beginPath();
  context.arc(centerX, centerY, minDimension * 0.16, 0, Math.PI * 2);
  context.fill();
}

function drawAuroraBorealis(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
  silence: number,
  intensity: number,
  harmony: number,
  sustainOn: boolean,
): void {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#020816');
  sky.addColorStop(0.5, '#06132a');
  sky.addColorStop(1, '#02050a');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 80; index += 1) {
    const seed = seededUnit(`aurora-star-${index}`, 1);
    const starX = seededUnit(`aurora-star-${index}`, 2) * width;
    const starY = seededUnit(`aurora-star-${index}`, 3) * height * 0.55;
    context.fillStyle = `rgba(255,255,255,${0.08 + seed * 0.28})`;
    context.beginPath();
    context.arc(starX, starY, 0.5 + seed * 1.4, 0, Math.PI * 2);
    context.fill();
  }

  for (const band of state.auroraBands) {
    const age = clamp((now - band.createdAt) / 40000, 0, 1);
    const bandAlpha = Math.max(0.03, band.alpha * (1 - age * 0.3) * (1 - silence * 0.5));
    const shimmer = 0.8 + (Math.sin(now * 0.0018 + band.shimmer) + 1) * 0.16;
    for (let layer = 0; layer < 3; layer += 1) {
      const layerOffset = layer * 12;
      context.strokeStyle = hsla(band.hue + layer * 6, 88, layer === 0 ? 72 : 66, bandAlpha * (0.44 - layer * 0.1));
      context.lineWidth = Math.max(8, band.thickness - layerOffset) * shimmer;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-20, band.baseY * height);
      for (let x = 0; x <= width + 40; x += 88) {
        const wave = Math.sin(x * 0.007 + band.phase + layer * 0.6) * band.amplitude;
        const y = band.baseY * height + wave - layer * 10;
        const controlX = x + 44;
        const controlY = band.baseY * height + Math.sin((x + 44) * 0.007 + band.phase + layer * 0.6) * band.amplitude - layer * 10;
        context.quadraticCurveTo(controlX, controlY, x + 88, y);
      }
      context.stroke();
    }

    const curtainStep = sustainOn ? 7 : 14;
    const curtainAlphaBoost = sustainOn ? 0.3 : 0;
    const curtainCount = Math.floor(width / curtainStep);
    for (let c = 0; c < curtainCount; c += 1) {
      const cx = (c / curtainCount) * width;
      const waveY = band.baseY * height + Math.sin(cx * 0.007 + band.phase) * band.amplitude;
      const curtainLen = 40 + Math.sin(cx * 0.04 + now * 0.001 + band.shimmer) * 25;
      const curtainGrad = context.createLinearGradient(cx, waveY, cx, waveY + curtainLen);
      curtainGrad.addColorStop(0, hsla(band.hue, 90, 72, clamp(bandAlpha * 0.55 + curtainAlphaBoost, 0, 0.9)));
      curtainGrad.addColorStop(1, hsla(band.hue, 90, 72, 0));
      context.strokeStyle = curtainGrad;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cx, waveY);
      context.lineTo(cx, waveY + curtainLen);
      context.stroke();
    }

    for (let s = 0; s < 18; s += 1) {
      const sx = seededUnit(`aurora-sparkle-${band.createdAt}-${s}`, 1) * width;
      const sparkWaveY = band.baseY * height + Math.sin(sx * 0.007 + band.phase) * band.amplitude;
      const sparkleAlpha =
        ((Math.sin(now * 0.003 * (0.4 + seededUnit(`aurora-sparkle-${band.createdAt}-${s}`, 2) * 0.8) + s) + 1) * 0.5) *
        bandAlpha *
        0.9;
      context.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
      context.beginPath();
      context.arc(sx, sparkWaveY, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Horizon reflection — alpha responds to intensity and harmony instead of being fixed
  const reflectionAlpha = clamp(0.05 + intensity * 0.16 + harmony * 0.12, 0.04, 0.32);
  context.save();
  context.globalAlpha = reflectionAlpha;
  for (const band of state.auroraBands) {
    const age = clamp((now - band.createdAt) / 40000, 0, 1);
    const bandAlpha = Math.max(0.03, band.alpha * (1 - age * 0.3) * (1 - silence * 0.5));
    const reflectBaseY = height * 0.96 - (1 - band.baseY) * height * 0.14;
    context.strokeStyle = hsla(band.hue, 88, 66, bandAlpha * 0.5);
    context.lineWidth = Math.max(4, band.thickness * 0.4);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-20, reflectBaseY);
    for (let x = 0; x <= width + 40; x += 88) {
      const wave = Math.sin(x * 0.007 + band.phase) * band.amplitude * 0.3;
      const controlX = x + 44;
      const controlY = reflectBaseY + Math.sin((x + 44) * 0.007 + band.phase) * band.amplitude * 0.3;
      context.quadraticCurveTo(controlX, controlY, x + 88, reflectBaseY + wave);
    }
    context.stroke();
  }
  context.restore();

  const horizon = context.createLinearGradient(0, height * 0.68, 0, height);
  horizon.addColorStop(0, 'rgba(8, 26, 34, 0)');
  horizon.addColorStop(1, 'rgba(2, 8, 12, 0.86)');
  context.fillStyle = horizon;
  context.fillRect(0, height * 0.68, width, height * 0.32);
}

function drawFireworks(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
): void {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, hsla(216 - state.skyWarmth * 18, 72, 12 + state.skyWarmth * 4, 1));
  sky.addColorStop(0.52, hsla(228 - state.skyWarmth * 24, 58, 10 + state.skyWarmth * 8, 1));
  sky.addColorStop(1, hsla(18 + state.skyWarmth * 18, 62, 12 + state.skyWarmth * 18, 1));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);


  for (const shell of state.fireworkShells) {
    for (let index = 1; index < shell.trail.length; index += 1) {
      const previous = shell.trail[index - 1];
      const current = shell.trail[index];
      const alpha = index / shell.trail.length;
      context.strokeStyle = hsla(shell.hue, 92, 72, alpha * 0.36);
      context.lineWidth = shell.size * 1.8;
      context.beginPath();
      context.moveTo(previous.x * width, previous.y * height);
      context.lineTo(current.x * width, current.y * height);
      context.stroke();
    }
    drawSoftGlow(context, shell.x * width, shell.y * height, 18 + shell.size * 8, shell.hue, 0.22);
    context.fillStyle = hsla(shell.hue, 96, 78, 0.96);
    context.beginPath();
    context.arc(shell.x * width, shell.y * height, shell.size, 0, Math.PI * 2);
    context.fill();
  }

  for (const particle of state.fireworkParticles) {
    const age = clamp((now - particle.createdAt) / particle.lifeMs, 0, 1);
    const sparkle = 0.72 + (Math.sin(now * 0.004 + particle.sparkle) + 1) * 0.16;
    const x = particle.x * width;
    const y = particle.y * height;
    drawSoftGlow(context, x, y, particle.size * 6, particle.hue, particle.alpha * 0.14 * (1 - age));
    context.fillStyle = hsla(particle.hue, 96, 72, particle.alpha * (1 - age) * sparkle);
    context.beginPath();
    context.arc(x, y, particle.size * (1 - age * 0.3), 0, Math.PI * 2);
    context.fill();
  }

  for (const midi of props.activeNotes) {
    const lane = adaptiveLaneRatio(midi, state.adaptiveMin, state.adaptiveMax);
    const x = lerp(0.08, 0.92, lane) * width;
    const trail = context.createLinearGradient(x, height, x, height * 0.42);
    trail.addColorStop(0, hsla(midiToHue(midi), 92, 74, 0.34));
    trail.addColorStop(1, hsla(midiToHue(midi), 92, 74, 0));
    context.strokeStyle = trail;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(x, height);
    context.lineTo(x, height * 0.44);
    context.stroke();
  }
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number,
): void {
  context.beginPath();
  if (sides === 0) {
    context.arc(cx, cy, radius, 0, Math.PI * 2);
  } else {
    for (let i = 0; i <= sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
  }
  context.closePath();
}

function drawSacredGeometry(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
): void {
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#06040e');
  bg.addColorStop(1, '#0e0820');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.min(width, height) * 0.82);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  for (let a = 0; a < state.geometryRings.length; a += 1) {
    const ringA = state.geometryRings[a];
    const pitchClassA = ringA.midi % 12;
    for (let b = a + 1; b < state.geometryRings.length; b += 1) {
      const ringB = state.geometryRings[b];
      if (ringB.midi % 12 === pitchClassA) {
        const ax = ringA.x * width;
        const ay = ringA.y * height;
        const bx = ringB.x * width;
        const by = ringB.y * height;
        const lineAlpha = Math.min(ringA.alpha, ringB.alpha) * 0.22;
        context.strokeStyle = hsla(ringA.hue, 80, 70, lineAlpha);
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(ax, ay);
        context.lineTo(bx, by);
        context.stroke();
      }
    }
  }

  for (const ring of state.geometryRings) {
    if (ring.radius < 2) continue;
    const cx = ring.x * width;
    const cy = ring.y * height;
    const outerSides = ring.sides;
    const innerSides = ring.sides;
    const innerRotationOffset = Math.PI / ring.sides;

    drawSoftGlow(context, cx, cy, ring.radius * 1.8, ring.hue, ring.alpha * 0.22);

    context.strokeStyle = hsla(ring.hue, 90, 72, ring.alpha * 0.85);
    context.lineWidth = 1.5;
    drawPolygon(context, cx, cy, ring.radius, outerSides, ring.rotation);
    context.stroke();

    context.strokeStyle = hsla((ring.hue + 180) % 360, 80, 68, ring.alpha * 0.35);
    context.lineWidth = 0.8;
    drawPolygon(context, cx, cy, ring.radius * 0.6, innerSides, ring.rotation + innerRotationOffset);
    context.stroke();

    const dotR = 2 + ring.alpha * 2;
    context.fillStyle = hsla(ring.hue, 96, 88, ring.alpha * 0.9);
    context.beginPath();
    context.arc(cx, cy, dotR, 0, Math.PI * 2);
    context.fill();
  }
}

function drawMetronomePulse(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pulses: MetronomePulse[],
  now: number,
): void {
  for (const pulse of pulses) {
    const age = clamp((now - pulse.createdAt) / 780, 0, 1);
    const radius = Math.min(width, height) * (0.24 + age * 0.34);
    context.strokeStyle = `rgba(160, 195, 255, ${(1 - age) * 0.34})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(width / 2, height * 0.52, radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawBadges(
  context: CanvasRenderingContext2D,
  palette: ScenePalette,
  activeNotes: number[],
  width: number,
  height: number,
): void {
  const labels = activeNotes.slice(-5).map((note) => midiToLabel(note));
  if (labels.length === 0) {
    return;
  }

  const text = labels.join('  ');
  context.font = '700 12px "Segoe UI", system-ui, sans-serif';
  const metrics = context.measureText(text);
  const badgeWidth = metrics.width + 28;
  context.fillStyle = 'rgba(8, 14, 26, 0.64)';
  fillRoundedRect(context, width - badgeWidth - 24, height * 0.3, badgeWidth, 28, 999);
  context.fill();
  context.fillStyle = palette.text;
  context.textAlign = 'left';
  context.fillText(text, width - badgeWidth - 10, height * 0.3 + 18);
}

function drawBubblePop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SceneState,
  now: number,
): void {
  // Soft sky background
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#b8e4f9');
  bg.addColorStop(1, '#f0f8ff');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  // Draw bubbles
  for (const b of state.bubbles) {
    const age = now - b.createdAt;
    const fadeStart = b.lifetime - 600;
    const alpha = age > fadeStart ? 1 - (age - fadeStart) / 600 : 1;
    const px = b.x * width;
    const py = b.y * height;

    // Bubble body
    const grad = context.createRadialGradient(
      px - b.radius * 0.3, py - b.radius * 0.3, b.radius * 0.1,
      px, py, b.radius,
    );
    grad.addColorStop(0, `hsla(${b.hue}, 90%, 95%, ${0.55 * alpha})`);
    grad.addColorStop(0.7, `hsla(${b.hue}, 80%, 70%, ${0.35 * alpha})`);
    grad.addColorStop(1, `hsla(${b.hue}, 70%, 55%, ${0.15 * alpha})`);
    context.beginPath();
    context.arc(px, py, b.radius, 0, Math.PI * 2);
    context.fillStyle = grad;
    context.fill();

    // Rim
    context.beginPath();
    context.arc(px, py, b.radius, 0, Math.PI * 2);
    context.strokeStyle = `hsla(${b.hue}, 80%, 75%, ${0.6 * alpha})`;
    context.lineWidth = 1.5;
    context.stroke();

    // Specular highlight
    context.beginPath();
    context.arc(px - b.radius * 0.32, py - b.radius * 0.32, b.radius * 0.2, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
    context.fill();
  }

  // Pop sparkles
  for (const p of state.bubblePops) {
    const t = (now - p.createdAt) / 500;
    const popAlpha = 1 - t;
    const px = p.x * width;
    const py = p.y * height;
    for (const pt of p.particles) {
      const sx = px + pt.dx * t * 30;
      const sy = py + pt.dy * t * 30;
      context.beginPath();
      context.arc(sx, sy, Math.max(0.5, 3 * (1 - t)), 0, Math.PI * 2);
      context.fillStyle = `hsla(${p.hue}, 90%, 75%, ${popAlpha})`;
      context.fill();
    }
  }
}

export function getEffectProfile(preset: VisualPreset): SceneEffectProfile {
  switch (preset) {
    case 'subtle':
      return { bloomBlurMin: 3, bloomBlurMax: 6, bloomAlphaCap: 0.10, vignetteStrength: 0.14, colorGradeStrength: 0.04 };
    case 'vivid':
      return { bloomBlurMin: 6, bloomBlurMax: 13, bloomAlphaCap: 0.26, vignetteStrength: 0.34, colorGradeStrength: 0.15 };
    default: // 'balanced'
      return { bloomBlurMin: 4, bloomBlurMax: 9, bloomAlphaCap: 0.18, vignetteStrength: 0.24, colorGradeStrength: 0.09 };
  }
}

function applyDynamicBloom(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  mode: FreePlayVisualMode,
  preset: VisualPreset,
  intensity: number,
  harmony: number,
  silence: number,
  sustainEnvelope: number,
): void {
  // No bloom for scale-heatmap
  if (mode === 'scale-heatmap') return;

  const profile = getEffectProfile(preset);

  // Reduced bloom caps for modes that should stay restrained
  const modeAlphaCap =
    mode === 'ink-in-water' ? Math.min(0.06, profile.bloomAlphaCap) :
    mode === 'classic-piano' ? Math.min(0.08, profile.bloomAlphaCap) :
    profile.bloomAlphaCap;

  // Bloom energy driven by musical activity; decays in silence
  const bloomEnergy = clamp(intensity * 0.52 + harmony * 0.28 + sustainEnvelope * 0.22 - silence * 0.38, 0, 1);
  if (bloomEnergy < 0.01) return;

  const blurRadius = lerp(profile.bloomBlurMin, profile.bloomBlurMax, bloomEnergy);
  const bloomAlpha = clamp(bloomEnergy * modeAlphaCap, 0, modeAlphaCap);
  if (bloomAlpha < 0.007) return;

  context.save();
  context.filter = `blur(${blurRadius.toFixed(1)}px)`;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = bloomAlpha;
  context.drawImage(canvas, 0, 0, width, height);
  context.filter = 'none';
  context.restore();
}

function applyDynamicVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: VisualPreset,
): void {
  const strength = getEffectProfile(preset).vignetteStrength;
  if (strength < 0.01) return;
  const gradient = context.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.28,
    width / 2, height / 2, Math.max(width, height) * 0.74,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength.toFixed(2)})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function applyKeyColorGrade(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: FreePlayVisualMode,
  preset: VisualPreset,
  keyHue: number,
  intensity: number,
): void {
  if (mode === 'scale-heatmap' || mode === 'ink-in-water') return;
  const baseStrength = getEffectProfile(preset).colorGradeStrength;
  if (baseStrength < 0.005) return;

  const modeMultiplier =
    mode === 'concert-stage' || mode === 'constellation' || mode === 'particle-galaxy' || mode === 'aurora-borealis' || mode === 'sacred-geometry' ? 1.0 :
    mode === 'classic-piano' ? 0.28 :
    0.60;

  const gradeAlpha = baseStrength * modeMultiplier * clamp(intensity * 0.6 + 0.35, 0.35, 1.0);
  if (gradeAlpha < 0.004) return;

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, hsla(keyHue, 70, 46, gradeAlpha * 0.55));
  gradient.addColorStop(0.48, hsla(keyHue, 70, 46, 0));
  gradient.addColorStop(1, hsla((keyHue + 180) % 360, 58, 36, gradeAlpha * 0.38));
  context.save();
  context.globalCompositeOperation = 'overlay';
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function FreePlayCanvasScene(props: FreePlayCanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef(props);
  const sceneStateRef = useRef<SceneState>(createSceneState());

  latestPropsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const state = sceneStateRef.current;
    let frameHandle = 0;

    const drawFrame = () => {
      const nextProps = latestPropsRef.current;
      const now = performance.now();
      const palette = readPalette();
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;

      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      syncSceneState(state, nextProps, now);

      const deltaMs = state.lastFrameAt === null ? 16.7 : Math.max(8, now - state.lastFrameAt);
      state.lastFrameAt = now;

      const intensity = calculateVisualIntensity(state.noteHistory, nextProps.activeNotes, now);
      const harmony = calculateHarmonyEnergy(nextProps.activeNotes, state.noteHistory, now);
      state.lastHarmony = harmony;
      const silence = calculateSilenceProgress(nextProps.activeNotes, state.noteHistory, now);
      const pitchCenter = calculatePitchCenter(nextProps.activeNotes, state.noteHistory, now);
      const keyCenter = detectKeyCenter(state.noteHistory, now);

      updateDynamics(state, nextProps, now, deltaMs, intensity, harmony, silence);
      trimSceneState(state, now);

      context.clearRect(0, 0, width, height);

      switch (nextProps.mode) {
        case 'concert-stage':
          drawConcertStage(context, width, height, state, nextProps, now, intensity, pitchCenter, keyCenter.hue);
          break;
        case 'classic-piano':
          drawClassicPiano(context, width, height);
          break;
        case 'color-ribbons':
          drawColorRibbons(context, width, height, state.ribbons, now, keyCenter.hue, state.adaptiveMin, state.adaptiveMax);
          break;
        case 'pulse-orbit':
          drawPulseOrbit(context, width, height, state, nextProps, now, deltaMs, keyCenter.hue);
          break;
        case 'constellation':
          drawConstellation(context, width, height, state, now, intensity, keyCenter.hue, nextProps.sustainOn);
          break;
        case 'scale-heatmap':
          drawHeatmap(context, width, height, state, nextProps, keyCenter.hue, now);
          break;
        case 'ink-in-water':
          drawInkInWater(context, width, height, state, now, silence, nextProps.sustainOn);
          break;
        case 'tree-of-light':
          drawTreeOfLight(context, width, height, state, now, pitchCenter, intensity);
          break;
        case 'particle-galaxy':
          drawParticleGalaxy(context, width, height, state, now, harmony);
          break;
        case 'aurora-borealis':
          drawAuroraBorealis(context, width, height, state, now, silence, intensity, harmony, nextProps.sustainOn);
          break;
        case 'fireworks':
          drawFireworks(context, width, height, state, nextProps, now);
          break;
        case 'sacred-geometry':
          drawSacredGeometry(context, width, height, state, now);
          break;
        case 'bubble-pop':
          drawBubblePop(context, width, height, state, now);
          break;
      }

      // Phase 3: post-processing (before UI overlays so badges/metronome stay crisp)
      if (nextProps.mode !== 'bubble-pop') {
        applyKeyColorGrade(context, width, height, nextProps.mode, nextProps.visualPreset, keyCenter.hue, intensity);
        applyDynamicBloom(context, canvas, width, height, nextProps.mode, nextProps.visualPreset, intensity, harmony, silence, state.sustainEnvelope);
      }
      if (nextProps.mode !== 'scale-heatmap' && nextProps.mode !== 'bubble-pop') {
        applyDynamicVignette(context, width, height, nextProps.visualPreset);
      }

      drawMetronomePulse(context, width, height, state.metronomePulses, now);
      drawBadges(context, palette, nextProps.activeNotes, width, height);

      frameHandle = window.requestAnimationFrame(drawFrame);
    };

    frameHandle = window.requestAnimationFrame(drawFrame);
    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  }, []);

  return (
    <div className="free-play-visualizer-scene" ref={containerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="free-play-scene-canvas" />
    </div>
  );
}
