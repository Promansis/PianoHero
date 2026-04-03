import { useEffect, useRef } from 'react';
import type { FreePlayVisualMode, FreePlayVisualNote } from './FreePlayVisualTypes';
import {
  applyNoteToHeatmap,
  buildHeatHistoryRow,
  calculatePitchCenter,
  calculateVisualIntensity,
  clamp,
  coolHeatValues,
  detectKeyCenter,
  findPeakHeatZones,
  lerp,
  midiToHue,
  midiToLabel,
  midiToLaneRatio,
  pitchClassLabel,
  selectConstellationMotif,
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
}

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

interface MetronomePulse {
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
  metronomePulses: MetronomePulse[];
  sustainEnvelope: number;
  lidAngle: number;
  pageFlutter: number;
  starfieldRotation: number;
  lastFrameAt: number | null;
  lastHeatRowAt: number;
  lastFogSpawnAt: number;
  lastMetronomeBeat: number;
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
    metronomePulses: [],
    sustainEnvelope: 0,
    lidAngle: 0.2,
    pageFlutter: 0,
    starfieldRotation: 0,
    lastFrameAt: null,
    lastHeatRowAt: 0,
    lastFogSpawnAt: 0,
    lastMetronomeBeat: 0,
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
  if (state.processedOrder.length > 4000) {
    const excess = state.processedOrder.length - 4000;
    for (const id of state.processedOrder.splice(0, excess)) {
      state.processedNoteIds.delete(id);
    }
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
      const lane = midiToLaneRatio(note.midi);
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
    const lane = midiToLaneRatio(note.midi);
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
  }

  if (props.metronomeEnabled && props.metronomeBeat !== state.lastMetronomeBeat) {
    state.metronomePulses.push({ createdAt: now });
  }
  state.lastMetronomeBeat = props.metronomeEnabled ? props.metronomeBeat : 0;
}

function updateDynamics(state: SceneState, props: FreePlayCanvasSceneProps, now: number, deltaMs: number, intensity: number): void {
  state.sustainEnvelope = lerp(state.sustainEnvelope, props.sustainOn ? 1 : 0, props.sustainOn ? 0.08 : 0.035);
  state.lidAngle = lerp(state.lidAngle, 0.2 + intensity * 0.16, 0.05);
  state.pageFlutter = lerp(state.pageFlutter, 0, 0.045);
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
}

function drawStageBursts(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bursts: NoteBurst[],
  now: number,
): void {
  for (const burst of bursts) {
    const age = clamp((now - burst.createdAt) / 1800, 0, 1);
    const x = midiToLaneRatio(burst.midi) * width;
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

  const spotlightX = midiToLaneRatio(pitchCenter) * width;
  const spotlightGradient = context.createRadialGradient(spotlightX, height * 0.63, 0, spotlightX, height * 0.7, 180 + intensity * 150);
  spotlightGradient.addColorStop(0, hsla(keyHue + 24, 94, 78, 0.24 + intensity * 0.18));
  spotlightGradient.addColorStop(1, hsla(keyHue + 24, 94, 78, 0));
  context.fillStyle = spotlightGradient;
  context.fillRect(0, 0, width, height);

  const floorGradient = context.createRadialGradient(width / 2, height * 0.9, 20, width / 2, height * 0.9, width * 0.55);
  floorGradient.addColorStop(0, 'rgba(255, 148, 94, 0.18)');
  floorGradient.addColorStop(0.55, 'rgba(89, 126, 255, 0.14)');
  floorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = floorGradient;
  context.fillRect(0, height * 0.55, width, height * 0.45);

  drawFog(context, width, height, state.fogPuffs, now, keyHue);
  drawStageBursts(context, width, height, state.stageBursts, now);

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
  state: SceneState,
  props: FreePlayCanvasSceneProps,
  now: number,
  intensity: number,
  keyHue: number,
): void {
  drawBackground(context, width, height, '#141a27', '#05070d');

  const pianoWidth = Math.min(width * 0.6, 700);
  const bodyWidth = pianoWidth * 0.72;
  const bodyHeight = height * 0.2;
  const bodyX = width / 2 - bodyWidth / 2;
  const bodyY = height * 0.62;
  const lidHeight = height * 0.22;
  const lidBackX = width / 2 + pianoWidth * 0.34;
  const lidTopY = bodyY - lidHeight - state.lidAngle * 110;

  context.fillStyle = 'rgba(10, 12, 18, 0.96)';
  fillRoundedRect(context, bodyX, bodyY, bodyWidth, bodyHeight, 28);
  context.fill();

  context.save();
  context.beginPath();
  context.moveTo(width / 2 - pianoWidth * 0.42, bodyY + 24);
  context.lineTo(width / 2 + pianoWidth * 0.44, bodyY + 24);
  context.lineTo(lidBackX, bodyY - 12);
  context.lineTo(width / 2 - pianoWidth * 0.28, bodyY - 12);
  context.closePath();
  context.clip();
  context.fillStyle = 'rgba(17, 22, 31, 0.95)';
  context.fillRect(width / 2 - pianoWidth * 0.42, bodyY - 14, pianoWidth * 0.9, 160);

  const recent = state.noteHistory.filter((event) => now - event.createdAt <= 1800);
  for (const event of recent) {
    const age = clamp((now - event.createdAt) / 1800, 0, 1);
    const x = width / 2 - pianoWidth * 0.38 + midiToLaneRatio(event.midi) * pianoWidth * 0.72;
    const amplitude = (1 - age) * (8 + event.velocity * 24);
    context.strokeStyle = hsla(midiToHue(event.midi), 84, 72, 0.2 + (1 - age) * 0.6);
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(x, bodyY + 28);
    context.lineTo(x + Math.sin(now * 0.018 + event.midi) * amplitude, bodyY + 28 + height * 0.12);
    context.stroke();
  }
  context.restore();

  context.fillStyle = 'rgba(7, 9, 14, 0.98)';
  context.beginPath();
  context.moveTo(width / 2 - pianoWidth * 0.45, bodyY - 10);
  context.lineTo(width / 2 + pianoWidth * 0.36, bodyY - 10);
  context.lineTo(lidBackX, lidTopY);
  context.lineTo(width / 2 - pianoWidth * 0.28, lidTopY);
  context.closePath();
  context.fill();

  const reflection = context.createLinearGradient(width / 2 - pianoWidth * 0.22, lidTopY + 18, width / 2 + pianoWidth * 0.22, bodyY);
  reflection.addColorStop(0, `rgba(255,255,255,${0.1 + intensity * 0.14})`);
  reflection.addColorStop(0.5, hsla(keyHue, 72, 78, 0.18 + intensity * 0.18));
  reflection.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = reflection;
  context.beginPath();
  context.moveTo(width / 2 - pianoWidth * 0.18, lidTopY + 20);
  context.lineTo(width / 2 + pianoWidth * 0.16, lidTopY + 12);
  context.lineTo(width / 2 + pianoWidth * 0.08, bodyY - 30);
  context.lineTo(width / 2 - pianoWidth * 0.24, bodyY - 14);
  context.closePath();
  context.fill();

  const standX = width / 2 - 50;
  const standY = bodyY - 96;
  const flutter = Math.sin(now * 0.01) * 4 + state.pageFlutter * 16;
  context.fillStyle = 'rgba(242, 236, 220, 0.92)';
  fillRoundedRect(context, standX - 54, standY, 60, 76, 8);
  context.fill();
  fillRoundedRect(context, standX + 6, standY + 4 + flutter * 0.08, 60, 76, 8);
  context.fill();
  context.strokeStyle = 'rgba(74, 61, 39, 0.3)';
  context.lineWidth = 1;
  for (let line = 0; line < 5; line += 1) {
    const y = standY + 18 + line * 10 + flutter * 0.02;
    context.beginPath();
    context.moveTo(standX - 44, y);
    context.lineTo(standX + 54, y);
    context.stroke();
  }

  context.fillStyle = props.sustainOn ? 'rgba(246, 206, 118, 0.9)' : 'rgba(170, 140, 88, 0.42)';
  fillRoundedRect(context, width / 2 - 68, bodyY + bodyHeight + 18, 136, 10, 999);
  context.fill();
}

function drawColorRibbons(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ribbons: RibbonTrail[],
  now: number,
  keyHue: number,
): void {
  drawBackground(context, width, height, hsla(keyHue - 28, 54, 15, 1), '#050812');

  for (const ribbon of ribbons) {
    const age = clamp((now - ribbon.createdAt) / 3600, 0, 1);
    const x = midiToLaneRatio(ribbon.midi) * width;
    const widthScale = 18 + ribbon.velocity * 38;
    const sway = Math.sin((now - ribbon.createdAt) * 0.003 + ribbon.midi * 0.2) * 24;
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
): void {
  drawBackground(context, width, height, '#08101f', '#02050d');

  const nebulaGradient = context.createRadialGradient(width * 0.25, height * 0.22, 10, width * 0.25, height * 0.22, width * 0.36);
  nebulaGradient.addColorStop(0, hsla(keyHue, 82, 60, 0.18 + intensity * 0.14));
  nebulaGradient.addColorStop(0.65, hsla((keyHue + 70) % 360, 72, 52, 0.08));
  nebulaGradient.addColorStop(1, hsla(keyHue, 82, 60, 0));
  context.fillStyle = nebulaGradient;
  context.fillRect(0, 0, width, height);

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

  for (const path of state.constellationPaths) {
    const age = clamp((now - path.createdAt) / 16000, 0, 1);
    const points = path.starIds
      .map((starId) => state.stars.find((star) => star.id === starId))
      .filter((star): star is StarNode => Boolean(star));
    if (points.length < 2) {
      continue;
    }
    context.strokeStyle = hsla(path.hue, 88, 72, 0.18 + (1 - age) * 0.34);
    context.lineWidth = 1.4;
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
): void {
  drawBackground(context, width, height, '#0b1221', '#03070f');

  const padding = { top: 70, right: 26, bottom: 30, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rows = state.heatHistory;
  const cellWidth = plotWidth / 88;
  const rowHeight = Math.max(1.5, plotHeight / Math.max(rows.length, 1));

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

  const peaks = findPeakHeatZones(state.heatValues);
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
      const pitchCenter = calculatePitchCenter(nextProps.activeNotes, state.noteHistory, now);
      const keyCenter = detectKeyCenter(state.noteHistory, now);

      updateDynamics(state, nextProps, now, deltaMs, intensity);
      trimSceneState(state, now);

      context.clearRect(0, 0, width, height);

      switch (nextProps.mode) {
        case 'concert-stage':
          drawConcertStage(context, width, height, state, nextProps, now, intensity, pitchCenter, keyCenter.hue);
          break;
        case 'classic-piano':
          drawClassicPiano(context, width, height, state, nextProps, now, intensity, keyCenter.hue);
          break;
        case 'color-ribbons':
          drawColorRibbons(context, width, height, state.ribbons, now, keyCenter.hue);
          break;
        case 'pulse-orbit':
          drawPulseOrbit(context, width, height, state, nextProps, now, deltaMs, keyCenter.hue);
          break;
        case 'constellation':
          drawConstellation(context, width, height, state, now, intensity, keyCenter.hue);
          break;
        case 'scale-heatmap':
          drawHeatmap(context, width, height, state, nextProps, keyCenter.hue);
          break;
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
