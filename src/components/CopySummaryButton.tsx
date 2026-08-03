import { ClipboardCheck, ClipboardList } from "lucide-react";
import { useState } from "react";
import { buildSummaryText, type SummaryTextInput } from "../../shared/summary-text";
import { copyText } from "../lib/clipboard";
import { useToast } from "./Toast";

const COPY_FEEDBACK_MS = 1600;

const BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800";

type CopySummaryButtonProps = {
  input: SummaryTextInput;
  className?: string;
};

export function CopySummaryButton({ input, className }: CopySummaryButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(buildSummaryText(input));
    if (!ok) {
      toast("Không sao chép được tổng kết", "error");
      return;
    }

    setCopied(true);
    toast("Đã sao chép tổng kết");
    window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className || BUTTON_CLASS}
      title="Copy bảng tổng kết dạng text để dán vào Zalo/Messenger"
    >
      {copied ? <ClipboardCheck size={16} /> : <ClipboardList size={16} />}
      {copied ? "Đã copy" : "Copy tổng kết"}
    </button>
  );
}
