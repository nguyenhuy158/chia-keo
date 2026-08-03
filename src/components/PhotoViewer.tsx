import { Check, ChevronLeft, ChevronRight, Download, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiPhoto, ApiPhotoDetail } from "../../shared/api-types";
import { toDataUrl } from "../../shared/photos";
import { PHOTO_CAPTION_MAX_LENGTH } from "../../shared/schemas";

/** Quang duong ngon tay toi thieu de tinh la mot lan vuot chuyen anh. */
const SWIPE_THRESHOLD_PX = 48;

type PhotoViewerProps = {
  photo: ApiPhoto;
  /** Anh goc; chua co thi tam hien ban thu nho. */
  detail: ApiPhotoDetail | undefined;
  index: number;
  total: number;
  expenseTitle?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDelete?: () => void;
  onSaveCaption?: (caption: string) => Promise<unknown>;
  pending?: boolean;
};

function ViewerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Xem anh toan man hinh: luot qua lai, sua chu thich, tai ve, xoa. */
export function PhotoViewer({
  photo,
  detail,
  index,
  total,
  expenseTitle,
  onPrev,
  onNext,
  onClose,
  onDelete,
  onSaveCaption,
  pending = false,
}: PhotoViewerProps) {
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setCaptionDraft(null);
  }, [photo.id]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function handleTouchEnd(endX: number) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null || total < 2) return;

    const distance = endX - startX;
    if (distance > SWIPE_THRESHOLD_PX) onPrev();
    if (distance < -SWIPE_THRESHOLD_PX) onNext();
  }

  async function handleSaveCaption() {
    if (!onSaveCaption || captionDraft === null) return;
    await onSaveCaption(captionDraft.trim());
    setCaptionDraft(null);
  }

  const source = detail ? toDataUrl(detail.mimeType, detail.data) : toDataUrl(photo.mimeType, photo.thumbData);
  const downloadName = `${(photo.caption || expenseTitle || "anh").replace(/[^\p{L}\d]+/gu, "-")}.jpg`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950">
      <div className="safe-top flex shrink-0 items-center justify-between gap-2 px-2 py-2">
        <ViewerButton label="Đóng ảnh" onClick={onClose}>
          <X size={22} />
        </ViewerButton>
        <span className="text-sm font-medium text-white/80 tabular">
          {index + 1}/{total}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={source}
            download={downloadName}
            aria-label="Tải ảnh về máy"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25"
          >
            <Download size={20} />
          </a>
          {onDelete && (
            <ViewerButton label="Xóa ảnh" onClick={onDelete} disabled={pending}>
              <Trash2 size={20} className="text-rose-300" />
            </ViewerButton>
          )}
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {total > 1 && (
          <div className="absolute inset-x-1 flex items-center justify-between">
            <ViewerButton label="Ảnh trước" onClick={onPrev}>
              <ChevronLeft size={26} />
            </ViewerButton>
            <ViewerButton label="Ảnh sau" onClick={onNext}>
              <ChevronRight size={26} />
            </ViewerButton>
          </div>
        )}
        <img
          src={source}
          alt={photo.caption || expenseTitle || "Ảnh cuộc chia"}
          className={`max-h-full max-w-full object-contain transition ${detail ? "" : "blur-sm"}`}
        />
      </div>

      <div className="safe-bottom shrink-0 space-y-2 px-4 py-3">
        {expenseTitle && (
          <p className="text-center text-xs font-medium text-violet-300">Hóa đơn: {expenseTitle}</p>
        )}
        {captionDraft === null ? (
          <div className="flex items-center justify-center gap-2">
            <p className="min-w-0 truncate text-center text-sm text-white/80">
              {photo.caption || (onSaveCaption ? "Chưa có chú thích" : "")}
            </p>
            {onSaveCaption && (
              <ViewerButton label="Sửa chú thích" onClick={() => setCaptionDraft(photo.caption)}>
                <Pencil size={16} />
              </ViewerButton>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-md items-center gap-2">
            <input
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveCaption();
                if (event.key === "Escape") setCaptionDraft(null);
              }}
              maxLength={PHOTO_CAPTION_MAX_LENGTH}
              autoFocus
              placeholder="Chú thích ảnh"
              className="h-11 min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:border-violet-400 focus:outline-none"
            />
            <ViewerButton label="Lưu chú thích" onClick={handleSaveCaption} disabled={pending}>
              <Check size={20} />
            </ViewerButton>
            <ViewerButton label="Hủy sửa chú thích" onClick={() => setCaptionDraft(null)}>
              <X size={20} />
            </ViewerButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
