import {
  getSummaryImageBackground,
  SUMMARY_IMAGE_BACKGROUNDS,
} from "../adapters/browser/summary-image-backgrounds";

type SummaryBackgroundPickerProps = {
  value: string;
  onChange: (id: string) => void;
  /** Hien ten nen dang chon canh nhan; tat o cho hep. */
  showLabel?: boolean;
};

/** Hang o vuong chon nen cho anh tong ket, dung chung o menu Copy va card xem truoc. */
export function SummaryBackgroundPicker({
  value,
  onChange,
  showLabel = true,
}: SummaryBackgroundPickerProps) {
  const selected = getSummaryImageBackground(value);

  return (
    <div>
      {showLabel && (
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Nền ảnh · {selected.label}
        </p>
      )}
      <div className={`flex items-center gap-1.5 ${showLabel ? "mt-2" : ""}`}>
        {SUMMARY_IMAGE_BACKGROUNDS.map((background) => (
          <button
            key={background.id}
            type="button"
            onClick={() => onChange(background.id)}
            title={`${background.label} — ${background.hint}`}
            aria-label={`Nền ${background.label}`}
            aria-pressed={background.id === value}
            style={{ background: background.preview }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[13px] leading-none transition ${
              background.id === value
                ? "border-violet-500 ring-2 ring-violet-500/40"
                : "border-stone-300 hover:border-stone-400 dark:border-stone-600"
            }`}
          >
            {background.previewEmoji}
          </button>
        ))}
      </div>
    </div>
  );
}
