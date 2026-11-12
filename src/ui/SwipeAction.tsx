import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useState,
} from "react";
import { cn } from "./cn";

const REVEAL_WIDTH = 88;
const OPEN_THRESHOLD = REVEAL_WIDTH / 2;
const AXIS_LOCK_PX = 8;

type DragState = { startX: number; startY: number; locked: "x" | "y" | null };

export type SwipeActionProps = {
  children: ReactNode;
  label: string;
  icon?: ReactNode;
  onAction: () => void;
  tone?: "danger" | "primary";
};

const TONE_CLASS = {
  danger: "bg-danger text-primary-fg",
  primary: "bg-primary text-primary-fg",
};

export function SwipeAction({
  children,
  label,
  icon,
  onAction,
  tone = "danger",
}: SwipeActionProps) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  function handlePointerDown(event: ReactPointerEvent) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    setDrag({ startX: event.clientX, startY: event.clientY, locked: null });
  }

  function handlePointerMove(event: ReactPointerEvent) {
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    let locked = drag.locked;
    if (!locked) {
      if (Math.abs(deltaX) < AXIS_LOCK_PX && Math.abs(deltaY) < AXIS_LOCK_PX)
        return;
      locked = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      setDrag({ ...drag, locked });
    }
    if (locked === "y") return;
    event.preventDefault();
    const base = open ? -REVEAL_WIDTH : 0;
    setDragX(Math.min(0, Math.max(-REVEAL_WIDTH, base + deltaX)));
  }

  function endDrag() {
    if (drag?.locked === "x") {
      const shouldOpen = dragX <= -OPEN_THRESHOLD;
      setOpen(shouldOpen);
      setDragX(shouldOpen ? -REVEAL_WIDTH : 0);
    }
    setDrag(null);
  }

  function close() {
    setOpen(false);
    setDragX(0);
  }

  return (
    <div className="relative overflow-hidden rounded-ui">
      {(open || dragX < 0) && (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            close();
            onAction();
          }}
          style={{ width: REVEAL_WIDTH }}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center gap-1 text-xs font-semibold",
            TONE_CLASS[tone],
          )}
        >
          {icon}
          {label}
        </button>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: drag ? "none" : "transform 180ms ease",
          touchAction: "pan-y",
        }}
        className="relative bg-surface"
      >
        {children}
        {open && (
          <button
            type="button"
            aria-label="Đóng"
            onClick={close}
            className="absolute inset-0 z-10 cursor-default"
          />
        )}
      </div>
    </div>
  );
}
