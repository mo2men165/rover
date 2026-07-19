"use client";

import { cn } from "@/lib/utils";

export type RadarSignal = {
  key: string;
  label: string;
  value: number;
};

function polygonPoint(cx: number, cy: number, r: number, index: number, count = 5) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Inline SVG radar/pentagon — Claude Design churn mockup. */
export function ChurnRadarChart({
  signals,
  className,
}: {
  signals: RadarSignal[];
  className?: string;
}) {
  const size = 232;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 14;
  const rings = [0.34, 0.67, 1];

  const padded = Array.from({ length: 5 }, (_, i) => signals[i] ?? {
    key: `pad-${i}`,
    label: "—",
    value: 0,
  });

  const ringPoints = rings.map((fraction) =>
    Array.from({ length: 5 }, (_, i) => {
      const p = polygonPoint(cx, cy, maxR * fraction, i);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  const axisEnds = Array.from({ length: 5 }, (_, i) => polygonPoint(cx, cy, maxR, i));
  const clampedValues = padded.map((s) => Math.max(0, Math.min(100, s.value)));
  const dataPoints = clampedValues.map((value, i) =>
    polygonPoint(cx, cy, (value / 100) * maxR, i)
  );
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("mx-auto block h-56 w-56 max-w-full", className)}
      role="img"
      aria-label="Churn risk signal radar chart"
    >
      {ringPoints.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      ))}
      {axisEnds.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={1}
        />
      ))}
      <polygon
        points={dataPolygon}
        fill="oklch(64% 0.19 25 / 0.28)"
        stroke="oklch(64% 0.19 25)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="oklch(64% 0.19 25)" />
      ))}
    </svg>
  );
}
