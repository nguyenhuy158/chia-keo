import { Download, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}

function useEscToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
}

/**
 * Nho phan tu dang focus truoc khi mo overlay, tra lai focus cho no sau khi
 * dong — khong co dong nay, nguoi dung ban phim mat tieu diem, phai Tab lai
 * tu dau trang.
 */
export function useRestoreFocus(open: boolean) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      return;
    }
    previouslyFocused.current?.focus();
    previouslyFocused.current = null;
  }, [open]);
}

type ImageLightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
  /** Bo trong thi khong hien nut tai ve. */
  onDownload?: () => void;
};

/**
 * Xem mot anh toan man hinh, kieu giong luc mo anh trong tab Anh. Anh tong ket
 * cao hon man hinh nen o day cuon doc duoc, khong co chuyen thu nho de vua khung
 * roi khong doc noi so tien.
 */
export function ImageLightbox({ open, src, alt, onClose, onDownload }: ImageLightboxProps) {
  useBodyScrollLock(open);
  useEscToClose(open, onClose);
  useRestoreFocus(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/90 animate-[overlay-in_120ms_ease]">
      {/* Nen bam vao dau cung dong, tru vung anh va hang nut. */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-zoom-out"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end gap-1 bg-gradient-to-b from-black/70 to-transparent p-2">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            aria-label="Tải ảnh về máy"
            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25"
          >
            <Download size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative h-full overflow-auto overscroll-contain p-3 pt-14">
        <img className="mx-auto block w-full max-w-2xl rounded-md" src={src} alt={alt} />
      </div>
    </div>,
    document.body,
  );
}
