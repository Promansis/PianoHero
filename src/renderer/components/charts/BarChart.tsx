import { useEffect, useRef } from 'react';

interface BarChartProps {
  title: string;
  color: string;
  data: Array<{ label: string; value: number }>;
  emptyLabel: string;
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

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#fffaf3';
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(36, 31, 26, 0.58)';
    context.font = '12px "Alegreya Sans", "Trebuchet MS", sans-serif';
    context.fillText(title, padding.left, 14);

    for (let tick = 0; tick <= 4; tick += 1) {
      const y = padding.top + (plotHeight / 4) * tick;
      context.strokeStyle = 'rgba(36, 31, 26, 0.08)';
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    if (data.length === 0) {
      context.fillStyle = 'rgba(36, 31, 26, 0.6)';
      context.font = '16px "Alegreya Sans", "Trebuchet MS", sans-serif';
      context.fillText(emptyLabel, padding.left, padding.top + plotHeight / 2);
      return;
    }

    const slotWidth = plotWidth / data.length;
    const barWidth = Math.min(48, slotWidth * 0.6);

    data.forEach((bar, index) => {
      const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
      const barHeight = (bar.value / resolvedMax) * plotHeight;
      const y = padding.top + plotHeight - barHeight;

      context.fillStyle = color;
      context.fillRect(x, y, barWidth, barHeight);

      context.fillStyle = 'rgba(36, 31, 26, 0.52)';
      context.font = '11px "Alegreya Sans", "Trebuchet MS", sans-serif';
      context.fillText(bar.label, x, height - 10);
      context.fillText(String(bar.value), x + 8, Math.max(padding.top + 12, y - 6));
    });
  }, [color, data, emptyLabel, title]);

  return <canvas className="performance-graph-canvas chart-canvas" ref={canvasRef} />;
}
