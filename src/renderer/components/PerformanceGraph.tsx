import { useEffect, useRef } from 'react';

interface PerformanceGraphProps {
  data: Array<{ measure: number; accuracy: number }>;
}

export function PerformanceGraph({ data }: PerformanceGraphProps) {
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
    const height = canvas.clientHeight || 220;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const theme = getComputedStyle(document.documentElement);
    const chartBg = theme.getPropertyValue('--color-chart-bg').trim() || '#fffaf3';
    const chartGrid = theme.getPropertyValue('--color-chart-grid').trim() || 'rgba(36, 31, 26, 0.12)';
    const textMuted = theme.getPropertyValue('--color-text-muted').trim() || 'rgba(36, 31, 26, 0.6)';
    const textSecondary = theme.getPropertyValue('--color-text-secondary').trim() || 'rgba(36, 31, 26, 0.56)';
    const accent = theme.getPropertyValue('--color-accent').trim() || '#1f3d7a';
    const success = theme.getPropertyValue('--color-good').trim() || '#40b56a';
    const danger = theme.getPropertyValue('--color-miss').trim() || '#bf5b44';
    const dangerSoft = theme.getPropertyValue('--color-danger-soft').trim() || 'rgba(191, 91, 68, 0.12)';
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    context.clearRect(0, 0, width, height);
    context.fillStyle = chartBg;
    context.fillRect(0, 0, width, height);

    const padding = { top: 20, right: 18, bottom: 32, left: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const thresholdY = padding.top + plotHeight * 0.3;

    context.fillStyle = dangerSoft;
    context.fillRect(padding.left, thresholdY, plotWidth, plotHeight - (thresholdY - padding.top));

    context.strokeStyle = chartGrid;
    context.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = padding.top + (plotHeight / 4) * tick;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();

      const label = String(100 - tick * 25);
      context.fillStyle = textMuted;
      context.font = '12px "Segoe UI", system-ui, sans-serif';
      context.fillText(label, 10, y + 4);
    }

    if (data.length === 0) {
      context.fillStyle = textSecondary;
      context.font = '16px "Segoe UI", system-ui, sans-serif';
      context.fillText('No measure data available yet.', padding.left, padding.top + plotHeight / 2);
      return;
    }

    const points = data.map((entry, index) => {
      const x =
        data.length === 1
          ? padding.left + plotWidth / 2
          : padding.left + (plotWidth * index) / Math.max(data.length - 1, 1);
      const y = padding.top + plotHeight * (1 - entry.accuracy / 100);
      return { x, y, accuracy: entry.accuracy, measure: entry.measure };
    });

    context.strokeStyle = accent;
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

    for (const point of points) {
      context.fillStyle = point.accuracy < 70 ? danger : success;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = textMuted;
    context.font = '12px "Segoe UI", system-ui, sans-serif';
    points.forEach((point, index) => {
      if (data.length > 10 && index % 2 === 1) {
        return;
      }
      context.fillText(String(point.measure + 1), point.x - 4, height - 10);
    });
  }, [data]);

  return <canvas className="performance-graph-canvas" ref={canvasRef} />;
}
