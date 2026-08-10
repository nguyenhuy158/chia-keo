import { Copy, Download, Expand } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  buildSummaryText,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../shared/summary-text";
import { copyImage, copyText, downloadBlob } from "../adapters/browser/clipboard";
import { usePreferences, useUpdatePreferences } from "../adapters/react-query/queries";
import { buildSummaryImageFileName, renderSummaryImage } from "../adapters/browser/summary-image";
import { ImageLightbox } from "./overlays";
import { SummaryBackgroundPicker } from "./SummaryBackgroundPicker";
import { Switch } from "./ui";
import { useSummaryImageBackground } from "./use-summary-image-background";

const VARIANTS: { value: SummaryVariant; label: string; hint: string }[] = [
  { value: "compact", label: "Gọn", hint: "Bản ngắn, dán nhanh" },
  { value: "detailed", label: "Chi tiết", hint: "Ghi rõ ai đã ứng, ai nhận lại" },
];

type ViewMode = "image" | "text";

const VIEW_MODES: { value: ViewMode; label: string; hint: string }[] = [
  { value: "image", label: "Ảnh", hint: "Ảnh PNG kèm QR" },
  { value: "text", label: "Chữ", hint: "Bản chữ để dán vào chat" },
];

/** Hai o chon nam canh nhau, dung cho ca Anh/Chu lan Gon/Chi tiet. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-950">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          title={option.hint}
          aria-pressed={value === option.value}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
            value === option.value
              ? "bg-white text-violet-700 shadow-sm dark:bg-stone-800 dark:text-violet-300"
              : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ACTION_CLASS =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800";

export function SummaryImageCard({ input }: { input: SummaryTextInput }) {
  const [backgroundId, chooseBackground] = useSummaryImageBackground();
  const [variant, setVariant] = useState<SummaryVariant>("compact");
  // Nho lua chon o server: bat/tat QR la thoi quen cua tung nhom, va giu
  // nguyen khi doi may hay xoa cache trinh duyet.
  const { summaryShowQr: showQr } = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const [viewMode, setViewMode] = useState<ViewMode>("image");
  const [zoomed, setZoomed] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);

  // `input` la object dung inline o trang cha nen doi identity moi lan render;
  // effect phai phu thuoc noi dung chu khong thi ve lai vo tan.
  const inputRef = useRef(input);
  inputRef.current = input;

  const renderKey = useMemo(() => {
    const accounts = input.participants
      .map((participant) => `${participant.bankId}:${participant.accountNo}`)
      .join("|");
    return `${backgroundId}\n${variant}\n${showQr}\n${accounts}\n${buildSummaryText(input, variant)}`;
  }, [backgroundId, variant, showQr, input]);

  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    // Che do chu khong dung den anh; ve san chi ton canvas va vai luot tai QR.
    if (viewMode !== "image") return;

    let cancelled = false;
    setPending(true);
    setFailed(false);

    renderSummaryImage(inputRef.current, variant, backgroundId, showQr).then(
      (rendered) => {
        if (cancelled) return;

        // Doi URL cu sang URL moi roi moi thu hoi: thu hoi truoc thi anh dang
        // hien nhay thanh o trong trong luc cho ban moi.
        const url = URL.createObjectURL(rendered);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;

        setBlob(rendered);
        setPreviewUrl(url);
        setPending(false);
      },
      () => {
        if (cancelled) return;
        setFailed(true);
        setPending(false);
      },
    );

    return () => {
      cancelled = true;
    };
    // renderKey da bao gom variant + backgroundId + noi dung.
  }, [renderKey, viewMode]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const fileName = buildSummaryImageFileName(input, variant);
  const summaryText = buildSummaryText(input, variant);

  async function copyPreview() {
    if (!blob) return;

    // copyImage nhan Promise vi Safari huy quyen clipboard neu await truoc; anh
    // o day da co san nen boc lai cho dung chu ky.
    if (await copyImage(Promise.resolve(blob))) {
      toast.success("Đã sao chép ảnh tổng kết");
      return;
    }

    try {
      downloadBlob(blob, fileName);
      toast("Trình duyệt không copy được ảnh, đã tải ảnh về máy");
    } catch {
      toast.error("Không sao chép được ảnh");
    }
  }

  async function copySummaryText() {
    const ok = await copyText(summaryText);
    (ok ? toast.success : toast.error)(
      ok ? "Đã sao chép tổng kết" : "Không sao chép được tổng kết",
    );
  }

  function savePreview() {
    if (!blob) return;

    try {
      downloadBlob(blob, fileName);
      toast.success("Đã tải ảnh tổng kết");
    } catch {
      toast.error("Không tải được ảnh");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Xem trước</h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {viewMode === "image"
          ? "Đúng ảnh sẽ được copy — bấm vào ảnh để xem to."
          : "Bản chữ để dán vào Zalo/Messenger."}
      </p>

      <div className="mt-3 space-y-2">
        <Segmented options={VIEW_MODES} value={viewMode} onChange={setViewMode} />
        <Segmented options={VARIANTS} value={variant} onChange={setVariant} />
      </div>

      {viewMode === "image" && (
        <div className="mt-3 space-y-2">
          <SummaryBackgroundPicker value={backgroundId} onChange={chooseBackground} />
          <Switch
            checked={showQr}
            onChange={(next) => updatePreferences.mutate({ summaryShowQr: next })}
            label="Hiện QR chuyển khoản trên ảnh"
          />
        </div>
      )}

      {viewMode === "image" ? (
        <div className="mt-3 overflow-hidden rounded-md border border-stone-200 dark:border-stone-700">
          {failed ? (
            <p className="p-4 text-sm text-stone-500 dark:text-stone-400">
              Không vẽ được ảnh trên trình duyệt này. Chuyển sang bản Chữ vẫn dùng được.
            </p>
          ) : previewUrl ? (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Xem ảnh to"
              className="group relative block w-full cursor-zoom-in"
            >
              <img
                // Anh mo dan trong luc ve ban moi cho biet la dang cap nhat.
                className={`block w-full transition-opacity ${pending ? "opacity-50" : "opacity-100"}`}
                src={previewUrl}
                alt="Xem trước ảnh tổng kết"
              />
              <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-80 transition group-hover:opacity-100">
                <Expand size={15} />
              </span>
            </button>
          ) : (
            <p className="p-4 text-sm text-stone-500 dark:text-stone-400">Đang vẽ ảnh...</p>
          )}
        </div>
      ) : (
        <pre className="mt-3 max-h-[26rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-stone-200 bg-stone-50 p-3 text-[13px] leading-relaxed text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200">
          {summaryText}
        </pre>
      )}

      <div className="mt-3 flex gap-2">
        {viewMode === "image" ? (
          <>
            <button type="button" onClick={copyPreview} disabled={!blob} className={ACTION_CLASS}>
              <Copy size={16} />
              Copy ảnh
            </button>
            <button type="button" onClick={savePreview} disabled={!blob} className={ACTION_CLASS}>
              <Download size={16} />
              Lưu về máy
            </button>
          </>
        ) : (
          <button type="button" onClick={copySummaryText} className={ACTION_CLASS}>
            <Copy size={16} />
            Copy chữ
          </button>
        )}
      </div>

      <ImageLightbox
        open={zoomed && previewUrl !== null}
        src={previewUrl || ""}
        alt="Ảnh tổng kết"
        onClose={() => setZoomed(false)}
        onDownload={savePreview}
      />
    </section>
  );
}
