import { useEffect, useRef } from 'react';
import type { SoundboardClip } from '../../lib/audio/soundboardCatalog';

export interface AnimalSoundboardBurst {
  id: string;
  clipId: string;
  emoji: string;
  label: string;
  accent: string;
  startX: number;
  startY: number;
  targetY: number;
  durationMs: number;
  wobbleAmplitude: number;
  wobbleFrequency: number;
  wobblePhase: number;
  createdAt: number;
}

interface AnimalSoundboardCanvasProps {
  clips: SoundboardClip[];
  activeNotes: number[];
  recentBursts: AnimalSoundboardBurst[];
}

interface Ripple {
  x: number;
  y: number;
  hue: number;
  createdAt: number;
  lifeMs: number;
}

interface FloatBubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  hue: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHue(color: string | undefined, fallback: number): number {
  if (!color) {
    return fallback;
  }
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return fallback;
  }

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) {
    return fallback;
  }

  let hue = 0;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}

function buildBubbles(clips: SoundboardClip[]): FloatBubble[] {
  if (clips.length === 0) {
    return [];
  }

  const count = Math.max(14, Math.min(24, Math.round(clips.length / 3)));
  return Array.from({ length: count }, (_, index) => {
    const clip = clips[index % clips.length];
    const seed = index + 1;
    return {
      x: ((seed * 17) % 97) / 100,
      y: ((seed * 13) % 84) / 100,
      radius: 20 + (seed % 5) * 10,
      speed: 0.001875 + (seed % 4) * 0.000525,
      drift: ((seed % 7) - 3) * 0.00035,
      hue: parseHue(clip?.accent, 20 + (seed * 29) % 320),
    };
  });
}

function drawEmojiBubble(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  burst: AnimalSoundboardBurst,
  now: number,
): void {
  const popDurationMs = 420;
  const elapsed = now - burst.createdAt;
  const baseHue = parseHue(burst.accent, 36);
  const bubbleRadius = Math.max(34, Math.min(width, height) * 0.075);

  if (elapsed <= burst.durationMs) {
    const progress = clamp(elapsed / burst.durationMs, 0, 1);
    const easeOut = 1 - (1 - progress) * (1 - progress);
    const wobble = Math.sin(progress * Math.PI * 2 * burst.wobbleFrequency + burst.wobblePhase) * burst.wobbleAmplitude;
    const x = clamp(burst.startX + wobble, 0.06, 0.94) * width;
    const y = (burst.startY + (burst.targetY - burst.startY) * easeOut) * height;
    const pulse = 1 + Math.sin(now * 0.006 + burst.wobblePhase) * 0.035;
    const radius = bubbleRadius * pulse;

    const gradient = context.createRadialGradient(
      x - radius * 0.28,
      y - radius * 0.34,
      radius * 0.12,
      x,
      y,
      radius,
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    gradient.addColorStop(0.55, `hsla(${baseHue}, 92%, 78%, 0.44)`);
    gradient.addColorStop(1, `hsla(${baseHue}, 88%, 62%, 0.16)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = `hsla(${baseHue}, 94%, 86%, 0.7)`;
    context.lineWidth = 2.2;
    context.stroke();

    context.fillStyle = 'rgba(255, 255, 255, 0.68)';
    context.beginPath();
    context.arc(x - radius * 0.32, y - radius * 0.34, radius * 0.18, 0, Math.PI * 2);
    context.fill();

    context.font = `700 ${Math.round(radius * 0.9)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(burst.emoji, x, y + radius * 0.02);
    return;
  }

  const popProgress = clamp((elapsed - burst.durationMs) / popDurationMs, 0, 1);
  if (popProgress >= 1) {
    return;
  }

  const x = burst.startX * width;
  const y = burst.targetY * height;
  const alpha = 1 - popProgress;
  context.strokeStyle = `hsla(${baseHue}, 96%, 76%, ${0.66 * alpha})`;
  context.lineWidth = 4 - popProgress * 2.5;
  context.beginPath();
  context.arc(x, y, bubbleRadius * (0.55 + popProgress * 1.3), 0, Math.PI * 2);
  context.stroke();

  for (let spark = 0; spark < 12; spark += 1) {
    const angle = (spark / 12) * Math.PI * 2 + burst.wobblePhase;
    const distance = bubbleRadius * (0.45 + popProgress * 1.35);
    const sparkX = x + Math.cos(angle) * distance;
    const sparkY = y + Math.sin(angle) * distance;
    context.fillStyle = `hsla(${(baseHue + spark * 11) % 360}, 100%, 78%, ${0.78 * alpha})`;
    context.beginPath();
    context.arc(sparkX, sparkY, Math.max(1.4, 4 - popProgress * 2.6), 0, Math.PI * 2);
    context.fill();
  }
}

export function AnimalSoundboardCanvas({
  clips,
  activeNotes,
  recentBursts,
}: AnimalSoundboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestActiveNotesRef = useRef(activeNotes);
  const latestBurstsRef = useRef(recentBursts);
  const latestClipsRef = useRef(clips);
  const pointerRef = useRef({ x: 0.5, y: 0.45, engaged: false });
  const ripplesRef = useRef<Ripple[]>([]);
  const bubblesRef = useRef<FloatBubble[]>(buildBubbles(clips));

  latestActiveNotesRef.current = activeNotes;
  latestBurstsRef.current = recentBursts;
  latestClipsRef.current = clips;

  useEffect(() => {
    bubblesRef.current = buildBubbles(clips);
  }, [clips]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const addRipple = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const y = clamp((clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
      pointerRef.current = { x, y, engaged: true };
      ripplesRef.current = [
        ...ripplesRef.current.slice(-11),
        {
          x,
          y,
          hue: 18 + Math.round(x * 180),
          createdAt: performance.now(),
          lifeMs: 1300,
        },
      ];
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerRef.current = {
        x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1),
        y: clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1),
        engaged: true,
      };
    };

    const handlePointerLeave = () => {
      pointerRef.current = { x: 0.5, y: 0.45, engaged: false };
    };

    const handlePointerDown = (event: PointerEvent) => {
      addRipple(event.clientX, event.clientY);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

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

    let frameHandle = 0;

    const drawFrame = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;
      const now = performance.now();

      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      const pointer = pointerRef.current;
      const activeClipCount = latestActiveNotesRef.current.length;
      const recentBurstsList = latestBurstsRef.current;
      const motionBoost = Math.min(1, activeClipCount / 4);

      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#72dcff');
      sky.addColorStop(0.38, '#7af7c5');
      sky.addColorStop(0.7, '#ffe36e');
      sky.addColorStop(1, '#ffae67');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      const sunX = width * (0.15 + pointer.x * 0.1);
      const sunY = height * (0.18 + pointer.y * 0.04);
      const sun = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.2);
      sun.addColorStop(0, 'rgba(255, 249, 199, 0.95)');
      sun.addColorStop(0.5, 'rgba(255, 217, 114, 0.45)');
      sun.addColorStop(1, 'rgba(255, 217, 114, 0)');
      context.fillStyle = sun;
      context.fillRect(0, 0, width, height);

      const cloudAlpha = 0.22 + motionBoost * 0.08;
      for (let index = 0; index < 5; index += 1) {
        const drift = ((now * (0.005 + index * 0.0008)) + index * 140) % (width + 200);
        const x = drift - 100;
        const y = height * (0.14 + index * 0.1) + Math.sin(now * 0.0015 + index) * 8;
        context.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
        context.beginPath();
        context.arc(x, y, 28, 0, Math.PI * 2);
        context.arc(x + 26, y - 8, 24, 0, Math.PI * 2);
        context.arc(x + 52, y, 20, 0, Math.PI * 2);
        context.fill();
      }

      const hillShift = pointer.engaged ? (pointer.x - 0.5) * 24 : 0;
      context.fillStyle = '#5ad26f';
      context.beginPath();
      context.moveTo(0, height * 0.72);
      context.quadraticCurveTo(width * 0.22 + hillShift, height * 0.58, width * 0.48, height * 0.72);
      context.quadraticCurveTo(width * 0.72 - hillShift, height * 0.83, width, height * 0.66);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fill();

      context.fillStyle = '#2fb357';
      context.beginPath();
      context.moveTo(0, height * 0.82);
      context.quadraticCurveTo(width * 0.28 - hillShift, height * 0.68, width * 0.56, height * 0.8);
      context.quadraticCurveTo(width * 0.82 + hillShift, height * 0.9, width, height * 0.78);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fill();

      bubblesRef.current = bubblesRef.current.map((bubble, index) => {
        const nextY = bubble.y - bubble.speed * (1 + motionBoost * 0.8);
        const nextX =
          bubble.x +
          Math.sin(now * 0.0007 + index) * bubble.drift +
          (pointer.engaged ? (pointer.x - bubble.x) * 0.0006 : 0);
        const wrappedY = nextY < -0.08 ? 1.08 : nextY;
        const clampedX = nextX < -0.05 ? 1.02 : nextX > 1.05 ? -0.02 : nextX;
        const px = clampedX * width;
        const py = wrappedY * height;
        const highlight = pointer.engaged
          ? Math.max(0, 1 - Math.hypot(pointer.x - clampedX, pointer.y - wrappedY) * 1.8)
          : 0;
        const radius = bubble.radius * (1 + highlight * 0.22);
        const gradient = context.createRadialGradient(
          px - radius * 0.26,
          py - radius * 0.32,
          radius * 0.14,
          px,
          py,
          radius,
        );
        gradient.addColorStop(0, `hsla(${bubble.hue}, 100%, 96%, 0.88)`);
        gradient.addColorStop(0.55, `hsla(${bubble.hue}, 88%, 72%, ${0.32 + highlight * 0.22})`);
        gradient.addColorStop(1, `hsla(${bubble.hue}, 78%, 58%, 0.08)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `hsla(${bubble.hue}, 85%, 85%, ${0.44 + highlight * 0.3})`;
        context.lineWidth = 1.5;
        context.stroke();
        context.fillStyle = `rgba(255,255,255,${0.55 + highlight * 0.2})`;
        context.beginPath();
        context.arc(px - radius * 0.28, py - radius * 0.3, radius * 0.18, 0, Math.PI * 2);
        context.fill();
        return {
          ...bubble,
          x: clampedX,
          y: wrappedY,
        };
      });

      ripplesRef.current = ripplesRef.current.filter((ripple) => now - ripple.createdAt < ripple.lifeMs);
      for (const ripple of ripplesRef.current) {
        const age = (now - ripple.createdAt) / ripple.lifeMs;
        const radius = 24 + age * Math.min(width, height) * 0.22;
        context.strokeStyle = `hsla(${ripple.hue}, 95%, 78%, ${0.55 * (1 - age)})`;
        context.lineWidth = 4 - age * 2.5;
        context.beginPath();
        context.arc(ripple.x * width, ripple.y * height, radius, 0, Math.PI * 2);
        context.stroke();
      }

      for (const burst of recentBurstsList) {
        drawEmojiBubble(context, width, height, burst, now);
      }

      frameHandle = window.requestAnimationFrame(drawFrame);
    };

    frameHandle = window.requestAnimationFrame(drawFrame);
    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  }, []);

  return (
    <div className="animal-soundboard-canvas-shell" ref={containerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="animal-soundboard-canvas" />
    </div>
  );
}
