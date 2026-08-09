import { Trash2 } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const REVEAL_WIDTH = 88;
const OPEN_THRESHOLD = REVEAL_WIDTH / 2;

type DragState = { startX: number; startY: number; locked: "x" | "y" | null };

type SwipeToDeleteProps = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

/**
 * Vuot trai de lo nut xoa do, roi bam nut moi xoa — giong Mail: khong xoa
 * ngay luc vuot, hai buoc lien tiep du de tranh vuot nham mat du lieu.
 *
 * Chi bat voi cu chi cham/but cam ung; chuot khong kich hoat gi ca nen nut
 * xoa co san canh moi dong (desktop) van la duong duy nhat tren may tinh,
 * hanh vi desktop khong doi.
 */
export function SwipeToDelete({ children, onDelete, deleteLabel = "Xóa" }: SwipeToDeleteProps) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  function handlePointerDown(event: ReactPointerEvent) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    setDrag({ startX: event.clientX, startY: event.clientY, locked: null });
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent) {
    if (!drag) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    let locked = drag.locked;

    if (!locked) {
      // Cho di chuyen du xa moi khoa huong, de phan biet vuot ngang voi cuon doc.
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      locked = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      setDrag({ ...drag, locked });
    }
    if (locked === "y") return; // nhuong lai cho trinh duyet tu cuon doc

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
    setDragging(false);
  }

  function close() {
    setOpen(false);
    setDragX(0);
  }

  const revealed = open || dragX < 0;

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Chi dung nut do khi dang vuot. Dung luc nao cung render thi o goc bo
          tron cua khung, mau do lo ra thanh vet do canh moi dong tren desktop
          — noi vuot khong bao gio xay ra vi chi bat pointer cham/but. */}
      {revealed && (
        <button
          type="button"
          onClick={() => {
            close();
            onDelete();
          }}
          aria-label={deleteLabel}
          style={{ width: REVEAL_WIDTH }}
          className="absolute inset-y-0 right-0 flex items-center justify-center gap-1 bg-rose-600 text-xs font-semibold text-white"
        >
          <Trash2 size={15} />
          {deleteLabel}
        </button>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 180ms ease",
          touchAction: "pan-y",
        }}
        // Nen duc BAT BUOC: nut xoa do nam duoi lop nay (absolute inset-y-0
        // right-0). Thieu nen thi mau do xuyen qua, de len ten va nuot hai nut
        // sua/xoa cua tung dong ngay ca khi chua vuot.
        className="relative bg-white dark:bg-stone-900"
      >
        {children}
        {open && (
          // Dong da mo thi bam vao dau trong vung noi dung cung dong lai,
          // khong vo tinh bam trung nut sua/xoa cu ben duoi da bi day lech.
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
