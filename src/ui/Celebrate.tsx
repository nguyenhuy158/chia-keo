import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

const PIECE_COUNT = 40;
const TONES = ["bg-primary", "bg-success", "bg-warning", "bg-danger"];
const MIN_DISTANCE_PX = 110;
const DISTANCE_RANGE_PX = 90;
const FALL_PX = 80;
const MAX_DELAY_MS = 120;
const BURST_MS = 2200;

function pieceStyle(index: number): CSSProperties {
  const angle = (index / PIECE_COUNT) * Math.PI * 2;
  const distance = MIN_DISTANCE_PX + ((index * 37) % DISTANCE_RANGE_PX);
  return {
    animation: `ui-celebrate ${BURST_MS}ms cubic-bezier(0.15, 0.8, 0.3, 1) ${(index * 13) % MAX_DELAY_MS}ms forwards`,
    "--celebrate-x": `${Math.round(Math.cos(angle) * distance)}px`,
    "--celebrate-y": `${Math.round(Math.sin(angle) * distance + FALL_PX)}px`,
    "--celebrate-spin": `${(index % 2 ? 1 : -1) * (180 + index * 20)}deg`,
  } as CSSProperties;
}

export type CelebrateProps = {
  children: ReactNode;
  className?: string;
};

export function Celebrate({ children, className }: CelebrateProps) {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {Array.from({ length: PIECE_COUNT }, (_, index) => (
          <span
            key={index}
            data-celebrate-piece=""
            className={cn(
              "absolute h-3.5 w-2",
              TONES[index % TONES.length],
              index % 3 === 0 ? "rounded-full" : "rounded-sm",
            )}
            style={pieceStyle(index)}
          />
        ))}
      </div>
      <div className="animate-[ui-pop_480ms_cubic-bezier(0.3,1.4,0.5,1)_both]">
        {children}
      </div>
    </div>
  );
}
