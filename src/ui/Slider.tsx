import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Hien gia tri ben phai, vi du `(v) => v + "%"`. */
  format?: (value: number) => string;
};

/**
 * Thanh truot dung <input type="range"> that: ban phim, screen reader va cham
 * tren mobile deu san. Phan da chon to mau bang background gradient theo %.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  className,
  ...rest
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(to right, var(--ui-primary) ${percent}%, var(--ui-surface-muted) ${percent}%)`,
        }}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          "[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow",
          "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface",
        )}
        {...rest}
      />
      {format && <span className="tabular w-12 shrink-0 text-right text-sm text-fg">{format(value)}</span>}
    </div>
  );
}
