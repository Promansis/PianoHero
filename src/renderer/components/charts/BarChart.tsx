import { useEffect, useRef } from 'react';

interface BarChartProps {
  title: string;
  color: string;
  data: Array<{ label: string; value: number }>;
  emptyLabel: string;
}

function resolveColorToken(token: string): string {
  if (typeof document === 'undefined') {
    return token;
  }

  const trimmed = token.trim();
  if (!trimmed.startsWith('var(')) {
    return trimmed;
  }

  const variableName = trimmed.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || trimmed;
}

export function BarChart({ title, color, data, emptyLabel }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const width = canvas.clientWidth || 720;
    const height = canvas.clientHeight || 240;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const padding = { top: 20, right: 16, bottom: 40, left: 44 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const resolvedMax = Math.max(...data.map((bar) => bar.value), 1);
    const theme = getComputedStyle(document.documentElement);
    const chartBg = theme.getPropertyValue('--color-chart-bg').trim() || '#fffaf3';
    const chartGrid = theme.getPropertyValue('--color-chart-grid').trim() || 'rgba(36, 31, 26, 0.08)';
    const textMuted = theme.getPropertyValue('--color-text-muted').trim() || 'rgba(36, 31, 26, 0.58)';
    const textSecondary = theme.getPropertyValue('--color-text-secondary').trim() || 'rgba(36, 31, 26, 0.52)';
    const resolvedColor = resolveColorToken(color);

    context.clearRect(0, 0, width, height);
    context.fillStyle = chartBg;
    context.fillRect(0, 0, width, height);

    context.fillStyle = textMuted;
    context.font = '12px "Segoe UI", system-ui, sans-serif';
    context.fillText(title, padding.left, 14);

    for (let tick = 0; tick <= 4; tick += 1) {
      const y = padding.top + (plotHeight / 4) * tick;
      context.strokeStyle = chartGrid;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    if (data.length === 0) {
      context.fillStyle = textMuted;
      context.font = '16px "Segoe UI", system-ui, sans-serif';
      context.fillText(emptyLabel, padding.left, padding.top + plotHeight / 2);
      return;
    }

    const slotWidth = plotWidth / data.length;
    const barWidth = Math.min(48, slotWidth * 0.6);

    data.forEach((bar, index) => {
      const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const barHeight = (bar.value / resolvedMax) * plotHeight;
      const y = padding.top + plotHeight - barHeight;

      context.fillStyle = resolvedColor;
      context.fillRect(x, y, barWidth, barHeight);

      context.fillStyle = textSecondary;
      context.font = '11px "Segoe UI", system-ui, sans-serif';
      context.fillText(bar.label, x, height - 10);
      context.fillText(String(bar.value), x + 8, Math.max(padding.top + 12, y - 6));
    });
  }, [color, data, emptyLabel, title]);

  return <canvas className="performance-graph-canvas chart-canvas" ref={canvasRef} />;
}
