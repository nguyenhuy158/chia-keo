import { Copy, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildSummaryText,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../shared/summary-text";
import { copyImage, downloadBlob } from "../adapters/browser/clipboard";
import { buildSummaryImageFileName, renderSummaryImage } from "../adapters/browser/summary-image";
import { SummaryBackgroundPicker } from "./SummaryBackgroundPicker";
import { useToast } from "./Toast";
import { useSummaryImageBackground } from "./use-summary-image-background";

const VARIANTS: { value: SummaryVariant; label: string; hint: string }[] = [
  { value: "compact", label: "Gọn", hint: "Bản ngắn, dán nhanh" },
  { value: "detailed", label: "Chi tiết", hint: "Ghi rõ ai đã ứng, ai nhận lại" },
];

const ACTION_CLASS =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800";

export function SummaryImageCard({ input }: { input: SummaryTextInput }) {
  const toast = useToast();
  const [backgroundId, chooseBackground] = useSummaryImageBackground();
  const [variant, setVariant] = useState<SummaryVariant>("compact");
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
    return `${backgroundId}\n${variant}\n${accounts}\n${buildSummaryText(input, variant)}`;
  }, [backgroundId, variant, input]);

  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setFailed(false);

    renderSummaryImage(inputRef.current, variant, backgroundId).then(
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
  }, [renderKey]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const fileName = buildSummaryImageFileName(input, variant);

  async function copyPreview() {
    if (!blob) return;

    // copyImage nhan Promise vi Safari huy quyen clipboard neu await truoc; anh
    // o day da co san nen boc lai cho dung chu ky.
    if (await copyImage(Promise.resolve(blob))) {
      toast("Đã sao chép ảnh tổng kết");
      return;
    }

    try {
      downloadBlob(blob, fileName);
      toast("Trình duyệt không copy được ảnh, đã tải ảnh về máy", "info");
    } catch {
      toast("Không sao chép được ảnh", "error");
    }
  }

  function savePreview() {
    if (!blob) return;

    try {
      downloadBlob(blob, fileName);
      toast("Đã tải ảnh tổng kết");
    } catch {
      toast("Không tải được ảnh", "error");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Xem trước ảnh</h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Đúng ảnh sẽ được copy — đổi nền là thấy ngay.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-950">
        {VARIANTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setVariant(option.value)}
            title={option.hint}
            aria-pressed={variant === option.value}
            className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
              variant === option.value
                ? "bg-white text-violet-700 shadow-sm dark:bg-stone-800 dark:text-violet-300"
                : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <SummaryBackgroundPicker value={backgroundId} onChange={chooseBackground} />
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-stone-200 dark:border-stone-700">
        {failed ? (
          <p className="p-4 text-sm text-stone-500 dark:text-stone-400">
            Không vẽ được ảnh trên trình duyệt này. Bản chữ trong menu Copy vẫn dùng được.
          </p>
        ) : previewUrl ? (
          <img
            // Anh mo dan trong luc ve ban moi cho biet la dang cap nhat.
            className={`block w-full transition-opacity ${pending ? "opacity-50" : "opacity-100"}`}
            src={previewUrl}
            alt="Xem trước ảnh tổng kết"
          />
        ) : (
          <p className="p-4 text-sm text-stone-500 dark:text-stone-400">Đang vẽ ảnh...</p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copyPreview} disabled={!blob} className={ACTION_CLASS}>
          <Copy size={16} />
          Copy ảnh
        </button>
        <button type="button" onClick={savePreview} disabled={!blob} className={ACTION_CLASS}>
          <Download size={16} />
          Lưu về máy
        </button>
      </div>
    </section>
  );
}
