import {
  ArrowLeftRight,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Images,
  Link as LinkIcon,
  ListChecks,
  type LucideIcon,
  QrCode,
  Rows3,
  Sigma,
  Table2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  buildExpenseSheetFileName,
  buildExpenseSheetTsv,
  buildTransactionRowsTsv,
} from "../../../shared/expense-sheet";
import { buildSettlementTableTsv } from "../../../shared/settlement-table";
import {
  buildSummaryText,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../../shared/summary-text";
import {
  copyImage,
  copyText,
  downloadBlob,
} from "../adapters/browser/clipboard";
import { renderExpenseXlsx } from "../adapters/browser/expense-xlsx";
import {
  buildSummaryImageFileName,
  renderSummaryImage,
} from "../adapters/browser/summary-image";
import {
  usePreferences,
  useUpdatePreferences,
} from "../adapters/react-query/queries";
import { SummaryBackgroundPicker } from "./SummaryBackgroundPicker";
import { useSummaryImageBackground } from "./use-summary-image-background";

const MENU_WIDTH = 268;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
/** Uoc luong de biet nen mo len hay xuong; khong can chinh xac tuyet doi. */
const MENU_HEIGHT_ESTIMATE = 440;
/** Duoi be rong nay (Tailwind `sm`) menu hien giua man hinh nhu hop thoai. */
const CENTERED_MENU_BREAKPOINT = 640;
const CENTERED_TRANSFORM = "translate(-50%, -50%)";

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
  left: number | string;
  top?: number | string;
  bottom?: number;
  maxHeight: number;
  transform?: string;
  centered: boolean;
};

type CopyMenuProps = {
  input: SummaryTextInput;
  className?: string;
  onShare?: (backgroundId: string) => void;
};

function computePosition(trigger: HTMLElement): MenuPosition {
  if (window.innerWidth < CENTERED_MENU_BREAKPOINT) {
    return {
      left: "50%",
      top: "50%",
      transform: CENTERED_TRANSFORM,
      maxHeight: window.innerHeight - VIEWPORT_MARGIN * 2,
      centered: true,
    };
  }

  const rect = trigger.getBoundingClientRect();
  const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.right - MENU_WIDTH, maxLeft),
  );
  const spaceBelow =
    window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
  const openUp = spaceBelow < MENU_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;

  return openUp
    ? {
        left,
        bottom: window.innerHeight - rect.top + MENU_GAP,
        maxHeight: spaceAbove,
        centered: false,
      }
    : {
        left,
        top: rect.bottom + MENU_GAP,
        maxHeight: spaceBelow,
        centered: false,
      };
}

export function CopyMenu({
  input: baseInput,
  className,
  onShare,
}: CopyMenuProps) {
  const {
    roundDownRefunds,
    summaryShowQr: showQr,
    summaryShowAvatar: showAvatar,
  } = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const input = useMemo(
    () => ({ ...baseInput, roundDownRefunds }),
    [baseInput, roundDownRefunds],
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [backgroundId, chooseBackground] = useSummaryImageBackground();

  const open = position !== null;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setPosition(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPosition(null);
    }
    function close() {
      setPosition(null);
    }
    function closeOnOutsideScroll(event: Event) {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setPosition(null);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", closeOnOutsideScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", closeOnOutsideScroll, true);
    };
  }, [open]);

  async function copySummaryText() {
    const ok = await copyText(buildSummaryText(input));
    (ok ? toast.success : toast.error)(
      ok ? "Đã sao chép tổng kết" : "Không sao chép được tổng kết",
    );
  }

  async function copyDetailedSummaryText() {
    const ok = await copyText(buildSummaryText(input, "detailed"));
    (ok ? toast.success : toast.error)(
      ok ? "Đã sao chép tổng kết chi tiết" : "Không sao chép được tổng kết",
    );
  }

  async function copyShareLink() {
    const ok = await copyText(input.shareUrl!);
    (ok ? toast.success : toast.error)(
      ok ? "Đã sao chép link" : "Không sao chép được link",
    );
  }

  async function copySummaryImage(variant: SummaryVariant = "compact") {
    const blob = renderSummaryImage(
      input,
      variant,
      backgroundId,
      showQr,
      showAvatar,
    );
    if (await copyImage(blob)) {
      toast.success("Đã sao chép ảnh tổng kết");
      return;
    }

    // Firefox va vai webview khong cho ghi anh vao clipboard, tai ve cho chac.
    try {
      downloadBlob(await blob, buildSummaryImageFileName(input, variant));
      toast("Trình duyệt không copy được ảnh, đã tải ảnh về máy");
    } catch {
      toast.error("Không tạo được ảnh tổng kết");
    }
  }

  async function saveSummaryImage() {
    try {
      downloadBlob(
        await renderSummaryImage(
          input,
          "compact",
          backgroundId,
          showQr,
          showAvatar,
        ),
        buildSummaryImageFileName(input),
      );
      toast.success("Đã tải ảnh tổng kết");
    } catch {
      toast.error("Không tạo được ảnh tổng kết");
    }
  }

  async function copySheet() {
    const ok = await copyText(buildExpenseSheetTsv(input));
    if (ok) toast.success("Đã sao chép bảng tính, dán vào Google Sheets");
    else toast.error("Không sao chép được bảng tính");
  }

  async function copySettlementTable() {
    const ok = await copyText(buildSettlementTableTsv(input));
    if (ok) toast.success("Đã sao chép bảng tổng hợp, dán vào Google Sheets");
    else toast.error("Không sao chép được bảng tổng hợp");
  }

  async function copyTransactionRows() {
    const tsv = buildTransactionRowsTsv(input);
    if (!tsv) {
      toast.error("Chưa có dòng chi thu nào để sao chép");
      return;
    }
    const ok = await copyText(tsv);
    if (ok)
      toast.success("Đã sao chép các dòng chi thu, dán vào Google Sheets");
    else toast.error("Không sao chép được các dòng chi thu");
  }

  async function saveExcel() {
    try {
      downloadBlob(
        await renderExpenseXlsx(input, input.name),
        buildExpenseSheetFileName(input.name, input.code),
      );
      toast.success("Đã tải file Excel");
    } catch {
      toast.error("Không tạo được file Excel");
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
      id: "text-detailed",
      label: "Copy tổng kết chi tiết",
      hint: "Ghi rõ ai đã ứng, ai nhận lại",
      icon: ArrowLeftRight,
      run: copyDetailedSummaryText,
    },
    {
      id: "image",
      label: "Copy ảnh",
      hint: "Ảnh PNG của bảng tổng kết",
      icon: ImageIcon,
      run: () => copySummaryImage(),
    },
    {
      id: "image-detailed",
      label: "Copy ảnh chi tiết",
      hint: "Ảnh PNG, ghi rõ ai đã ứng",
      icon: Images,
      run: () => copySummaryImage("detailed"),
    },
    {
      id: "toggle-qr",
      label: showQr ? "Ẩn QR trên ảnh" : "Hiện QR trên ảnh",
      hint: showQr
        ? "Ảnh chỉ còn chữ, không lộ tài khoản"
        : "Ảnh có QR chuyển khoản",
      icon: QrCode,
      run: async () => updatePreferences.mutate({ summaryShowQr: !showQr }),
    },
    {
      id: "download",
      label: "Lưu ảnh về máy",
      hint: "Tải file PNG",
      icon: Download,
      run: saveSummaryImage,
    },
    {
      id: "sheet",
      label: "Copy bảng tính",
      hint: "Dán thẳng vào Google Sheets/Excel",
      icon: Table2,
      run: copySheet,
    },
    {
      id: "settlement-table",
      label: "Copy bảng tổng hợp",
      hint: "Mỗi người: phải chịu, đã trả, còn chuyển",
      icon: Sigma,
      run: copySettlementTable,
    },
    {
      id: "sheet-rows",
      label: "Copy dòng chi thu",
      hint: "Chỉ các dòng giao dịch, không có tiêu đề và tổng",
      icon: Rows3,
      run: copyTransactionRows,
    },
    {
      id: "excel",
      label: "Tải Excel",
      hint: "File .xlsx giống bảng tính tiền",
      icon: FileSpreadsheet,
      run: saveExcel,
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
    if (input.shareUrl) onShare?.(backgroundId);
    await action.run();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          setPosition(
            open || !triggerRef.current
              ? null
              : computePosition(triggerRef.current),
          )
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className={className || TRIGGER_CLASS}
      >
        <Copy size={16} />
        Copy
        <ChevronDown
          size={15}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>

      {position &&
        createPortal(
          <>
            {position.centered && (
              <div
                aria-hidden="true"
                data-testid="copy-menu-backdrop"
                className="fixed inset-0 z-[69] bg-stone-950/40"
              />
            )}
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                width: MENU_WIDTH,
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                maxHeight: position.maxHeight,
                transform: position.transform,
              }}
              className="z-[70] overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-surface p-1 shadow-xl animate-[overlay-in_120ms_ease] dark:border-stone-700"
            >
              <div className="border-b border-stone-200 px-3 pb-2.5 pt-2 dark:border-stone-700">
                <SummaryBackgroundPicker
                  value={backgroundId}
                  onChange={chooseBackground}
                />
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
                    <Icon
                      size={18}
                      className="shrink-0 text-violet-600 dark:text-violet-400"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-950 dark:text-stone-50">
                        {action.label}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        {action.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
