import type { CSSProperties } from "react";

const PIECE_COUNT = 40;
const COLORS = [
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
];
const MIN_DISTANCE_PX = 110;
const DISTANCE_RANGE_PX = 90;
const FALL_PX = 80;
const MAX_DELAY_MS = 120;

function pieceStyle(index: number): CSSProperties {
  const angle = (index / PIECE_COUNT) * Math.PI * 2;
  const distance = MIN_DISTANCE_PX + ((index * 37) % DISTANCE_RANGE_PX);
  return {
    backgroundColor: COLORS[index % COLORS.length],
    animationDelay: `${(index * 13) % MAX_DELAY_MS}ms`,
    "--confetti-x": `${Math.round(Math.cos(angle) * distance)}px`,
    "--confetti-y": `${Math.round(Math.sin(angle) * distance + FALL_PX)}px`,
    "--confetti-spin": `${(index % 2 ? 1 : -1) * (180 + index * 20)}deg`,
  } as CSSProperties;
}

export function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {Array.from({ length: PIECE_COUNT }, (_, index) => (
        <span
          key={index}
          className={`confetti-piece absolute h-3.5 w-2 ${index % 3 === 0 ? "rounded-full" : "rounded-sm"}`}
          style={pieceStyle(index)}
        />
      ))}
    </div>
  );
}
