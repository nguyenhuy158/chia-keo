import { useRef, useState } from "react";
import { cn } from "./cn";

/** 1.234.567 -> "1,2 MB". Dung don vi thap phan cho khop voi con so nguoi dung quen thay. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1).replace(".", ",")} ${units[unit]}`;
}

export type FileUploadProps = {
  files: File[];
  onChange: (files: File[]) => void;
  /** Chuoi kieu thuoc tinh accept cua input, vi du "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  /** Gioi han moi tep, tinh bang byte. Vuot thi bi loai va bao loi. */
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
};

export function FileUpload({
  files,
  onChange,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  disabled,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    const list = Array.from(incoming);
    const tooBig = maxSize ? list.filter((file) => file.size > maxSize) : [];
    const ok = maxSize ? list.filter((file) => file.size <= maxSize) : list;

    let next = multiple ? [...files, ...ok] : ok.slice(0, 1);

    let message: string | null = null;
    if (tooBig.length > 0) {
      message = `Bỏ qua ${tooBig.length} tệp vượt quá ${formatBytes(maxSize!)}`;
    }
    if (maxFiles && next.length > maxFiles) {
      next = next.slice(0, maxFiles);
      message = `Chỉ nhận tối đa ${maxFiles} tệp`;
    }

    setError(message);
    onChange(next);
  };

  const remove = (index: number) => {
    setError(null);
    onChange(files.filter((_, current) => current !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        // dragover phai preventDefault, neu khong trinh duyet se mo tep thay vi
        // tha vao vung nay.
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-ui border border-dashed px-4 py-8 text-center transition",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          dragging ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-muted",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-fg-muted">
          <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-fg">Kéo tệp vào đây hoặc bấm để chọn</span>
        <span className="text-xs text-fg-muted">
          {accept ? `Chấp nhận: ${accept}` : "Mọi định dạng"}
          {maxSize ? ` · tối đa ${formatBytes(maxSize)} mỗi tệp` : ""}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          addFiles(event.target.files);
          // Xoa value de chon lai dung tep vua go van kich hoat onChange.
          event.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-ui border border-border bg-surface">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{file.name}</span>
                <span className="block text-xs text-fg-muted tabular">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Xoá ${file.name}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-ui text-fg-muted transition hover:bg-surface-muted hover:text-danger"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                  <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
