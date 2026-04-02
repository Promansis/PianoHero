import { useEffect, useRef } from 'react';

interface LineChartProps {
  title: string;
  color: string;
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  emptyLabel: string;
}

export function LineChart({ title, color, data, maxValue, emptyLabel }: LineChartProps) {
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
    const resolvedMax = Math.max(maxValue ?? 0, ...data.map((point) => point.value), 1);

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

      const label = Math.round(resolvedMax - (resolvedMax / 4) * tick);
      context.fillStyle = 'rgba(36, 31, 26, 0.52)';
      context.fillText(String(label), 8, y + 4);
    }

    if (data.length === 0) {
      context.fillStyle = 'rgba(36, 31, 26, 0.6)';
      context.font = '16px "Alegreya Sans", "Trebuchet MS", sans-serif';
      context.fillText(emptyLabel, padding.left, padding.top + plotHeight / 2);
      return;
    }

    const points = data.map((point, index) => {
      const x = data.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (plotWidth * index) / Math.max(data.length - 1, 1);
      const y = padding.top + plotHeight * (1 - point.value / resolvedMax);
      return { ...point, x, y };
    });

    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();

    context.fillStyle = color;
    for (const point of points) {
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = 'rgba(36, 31, 26, 0.52)';
    context.font = '11px "Alegreya Sans", "Trebuchet MS", sans-serif';
    points.forEach((point, index) => {
      if (points.length > 8 && index % 2 === 1) {
        return;
      }
      context.fillText(point.label, point.x - 10, height - 10);
    });
  }, [color, data, emptyLabel, maxValue, title]);

  return <canvas className="performance-graph-canvas chart-canvas" ref={canvasRef} />;
}
