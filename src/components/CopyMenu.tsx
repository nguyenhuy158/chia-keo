import {
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildSummaryText,
  type SettlementMode,
  type SummaryTextInput,
} from "../../shared/summary-text";
import { copyImage, copyText, downloadBlob } from "../lib/clipboard";
import { buildSummaryImageFileName, renderSummaryImage } from "../lib/summary-image";
import { useToast } from "./Toast";

const MENU_WIDTH = 268;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
/** Uoc luong de biet nen mo len hay xuong; khong can chinh xac tuyet doi. */
const MENU_HEIGHT_ESTIMATE = 320;

const MODE_OPTIONS: Array<{ value: SettlementMode; label: string; hint: string }> = [
  { value: "p2p", label: "Nhiều chiều", hint: "Chuyển thẳng giữa từng cặp, ít lượt nhất" },
  { value: "host", label: "Gom 1 người", hint: "Ai cũng chuyển về một đầu mối, chỉ một QR" },
];

const TRIGGER_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800";

type MenuAction = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => Promise<void>;
};

type MenuPosition = {
  left: number;
  top?: number;
  bottom?: number;
};

type CopyMenuProps = {
  input: SummaryTextInput;
  className?: string;
};

function computePosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - MENU_WIDTH, maxLeft));
  const openUp = rect.bottom + MENU_HEIGHT_ESTIMATE > window.innerHeight;

  return openUp
    ? { left, bottom: window.innerHeight - rect.top + MENU_GAP }
    : { left, top: rect.bottom + MENU_GAP };
}

export function CopyMenu({ input, className }: CopyMenuProps) {
  const toast = useToast();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mode, setMode] = useState<SettlementMode>("p2p");

  const open = position !== null;
  const summaryInput: SummaryTextInput = { ...input, settlementMode: mode };

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPosition(null);
    }
    function close() {
      setPosition(null);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  async function copySummaryText() {
    const ok = await copyText(buildSummaryText(summaryInput));
    toast(ok ? "Đã sao chép tổng kết" : "Không sao chép được tổng kết", ok ? "success" : "error");
  }

  async function copyShareLink() {
    if (!input.shareUrl) return;
    const ok = await copyText(input.shareUrl);
    toast(ok ? "Đã sao chép link" : "Không sao chép được link", ok ? "success" : "error");
  }

  async function copySummaryImage() {
    const blob = renderSummaryImage(summaryInput);
    if (await copyImage(blob)) {
      toast("Đã sao chép ảnh tổng kết");
      return;
    }

    // Firefox va vai webview khong cho ghi anh vao clipboard, tai ve cho chac.
    try {
      downloadBlob(await blob, buildSummaryImageFileName(summaryInput));
      toast("Trình duyệt không copy được ảnh, đã tải ảnh về máy", "info");
    } catch {
      toast("Không tạo được ảnh tổng kết", "error");
    }
  }

  async function saveSummaryImage() {
    try {
      downloadBlob(await renderSummaryImage(summaryInput), buildSummaryImageFileName(summaryInput));
      toast("Đã tải ảnh tổng kết");
    } catch {
      toast("Không tạo được ảnh tổng kết", "error");
    }
  }

  const actions: MenuAction[] = [
    {
      id: "text",
      label: "Copy tổng kết",
      hint: "Dạng chữ, dán vào Zalo/Messenger",
      icon: ListChecks,
      run: copySummaryText,
    },
    {
      id: "image",
      label: "Copy ảnh",
      hint: "Ảnh PNG của bảng tổng kết",
      icon: ImageIcon,
      run: copySummaryImage,
    },
    {
      id: "download",
      label: "Lưu ảnh về máy",
      hint: "Tải file PNG",
      icon: Download,
      run: saveSummaryImage,
    },
  ];

  if (input.shareUrl) {
    actions.push({
      id: "link",
      label: "Copy link",
      hint: "Chỉ link xem chi tiết",
      icon: LinkIcon,
      run: copyShareLink,
    });
  }

  async function handleSelect(action: MenuAction) {
    setPosition(null);
    await action.run();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setPosition(open || !triggerRef.current ? null : computePosition(triggerRef.current))}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className || TRIGGER_CLASS}
      >
        <Copy size={16} />
        Copy
        <ChevronDown size={15} className={open ? "rotate-180 transition" : "transition"} />
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", width: MENU_WIDTH, ...position }}
            className="z-[70] overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl animate-[overlay-in_120ms_ease] dark:border-stone-700 dark:bg-stone-900"
          >
            <div className="border-b border-stone-200 px-2 pb-2 pt-1.5 dark:border-stone-800">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Kiểu chuyển tiền
              </p>
              <div className="grid grid-cols-2 gap-1">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    title={option.hint}
                    aria-pressed={mode === option.value}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                      mode === option.value
                        ? "bg-violet-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(action)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-stone-100 active:bg-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700"
                >
                  <Icon size={18} className="shrink-0 text-violet-600 dark:text-violet-400" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-950 dark:text-stone-50">
                      {action.label}
                    </span>
                    <span className="block text-xs text-stone-500 dark:text-stone-400">
                      {action.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
