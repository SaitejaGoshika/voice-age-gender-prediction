import { useEffect, useRef, useCallback } from "react";

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  type?: "waveform" | "frequency" | "circular";
}

export default function WaveformVisualizer({
  analyserNode,
  isActive,
  color = "#6366f1",
  type = "waveform",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (type === "waveform") {
      const bufferLength = analyserNode.fftSize;
      const dataArray = new Float32Array(bufferLength);
      analyserNode.getFloatTimeDomainData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "rgba(15, 23, 42, 0.3)");
      bgGrad.addColorStop(1, "rgba(15, 23, 42, 0.1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = "rgba(100, 116, 139, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // Main waveform
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, "#a78bfa");
      gradient.addColorStop(1, color);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        const y = (v * height) / 2 + height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      // Fill under waveform with gradient
      ctx.shadowBlur = 0;
      ctx.lineTo(width, height / 2);
      ctx.lineTo(0, height / 2);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
      fillGrad.addColorStop(0, "rgba(99, 102, 241, 0.15)");
      fillGrad.addColorStop(0.5, "rgba(99, 102, 241, 0.05)");
      fillGrad.addColorStop(1, "rgba(99, 102, 241, 0.15)");
      ctx.fillStyle = fillGrad;
      ctx.fill();
    } else if (type === "frequency") {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "rgba(15, 23, 42, 0.3)";
      ctx.fillRect(0, 0, width, height);

      // Draw frequency bars
      const barCount = 64;
      const barWidth = width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * height;
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Color based on frequency
        const hue = (i / barCount) * 120 + 220; // blue to purple range
        const saturation = 80;
        const lightness = 50 + (value / 255) * 20;

        const barGrad = ctx.createLinearGradient(x, y, x, height);
        barGrad.addColorStop(
          0,
          `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`
        );
        barGrad.addColorStop(
          1,
          `hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.3)`
        );

        ctx.fillStyle = barGrad;

        // Rounded bars
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Glow on top
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, barWidth, 2);
        ctx.shadowBlur = 0;
      }
    } else if (type === "circular") {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.2;
      const maxRadius = Math.min(width, height) * 0.45;

      // Inner circle glow
      const avgValue =
        dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const glowRadius = baseRadius + (avgValue / 255) * 30;

      const innerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        glowRadius
      );
      innerGlow.addColorStop(0, "rgba(99, 102, 241, 0.3)");
      innerGlow.addColorStop(0.5, "rgba(139, 92, 246, 0.1)");
      innerGlow.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw circular frequency
      const points = 128;
      const step = Math.floor(bufferLength / points);

      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const idx = (i % points) * step;
        const value = idx < bufferLength ? dataArray[idx] : 0;
        const r = baseRadius + (value / 255) * (maxRadius - baseRadius);

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.stroke();

      // Fill with gradient
      ctx.shadowBlur = 0;
      const fillGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius,
        centerX,
        centerY,
        maxRadius
      );
      fillGrad.addColorStop(0, "rgba(99, 102, 241, 0.05)");
      fillGrad.addColorStop(1, "rgba(139, 92, 246, 0.02)");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [analyserNode, color, type]);

  useEffect(() => {
    if (isActive && analyserNode) {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyserNode, draw]);

  const heightClass =
    type === "circular" ? "aspect-square max-h-64" : "h-48";

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={type === "circular" ? 800 : 300}
        className={`w-full ${heightClass} rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm`}
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
            <svg
              className="w-5 h-5 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-sm">Start recording to visualize audio</span>
          </div>
        </div>
      )}
    </div>
  );
}
