import { Images, ImageUp } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiExpense, ApiPhoto } from "../../shared/api-types";
import { MAX_PHOTOS_PER_GAME } from "../../shared/schemas";
import { usePhotoUploader } from "../adapters/react-query/photo-upload";
import { PhotoGrid } from "./PhotoGrid";
import { useToast } from "./Toast";
import { usePhotoViewer } from "./use-photo-viewer";

/** HEIC tu iPhone duoc trinh duyet giai ma roi nen lai thanh JPEG truoc khi gui. */
export const PHOTO_FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type PhotoPickerButtonProps = {
  label: string;
  /** Nhan cho trinh doc man hinh khi nut chi co bieu tuong. */
  ariaLabel?: string;
  disabled?: boolean;
  onPick: (files: File[]) => void;
  className?: string;
  children?: ReactNode;
};

/** Nut chon anh tu thu vien hoac camera; nhan nhieu anh mot luot. */
export function PhotoPickerButton({
  label,
  ariaLabel,
  disabled = false,
  onPick,
  className = "",
  children,
}: PhotoPickerButtonProps) {
  return (
    <label
      aria-label={ariaLabel || label}
      className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] ${
        disabled ? "pointer-events-none opacity-50" : ""
      } ${className}`}
    >
      {children}
      {label}
      <input
        type="file"
        accept={PHOTO_FILE_ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          onPick(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
    </label>
  );
}

type PhotoPanelProps = {
  gameId: string;
  photos: ApiPhoto[];
  expenses: ApiExpense[];
  loading?: boolean;
};

/** Album anh cua mot cuoc chia: them, xem toan man hinh, sua chu thich, xoa. */
export function PhotoPanel({ gameId, photos, expenses, loading = false }: PhotoPanelProps) {
  const toast = useToast();
  const uploader = usePhotoUploader(gameId);
  const expenseTitleById = new Map(expenses.map((expense) => [expense.id, expense.title]));
  const photoViewer = usePhotoViewer(gameId, photos, expenseTitleById);
  const isFull = photos.length >= MAX_PHOTOS_PER_GAME;

  async function handlePick(files: File[]) {
    const uploaded = await uploader.upload(files);
    if (uploaded.length > 0) toast(`Đã thêm ${uploaded.length} ảnh`);
  }

  const addButton = (
    <PhotoPickerButton
      label={uploader.pending ? `Đang tải ${uploader.done + 1}/${uploader.total}` : "Thêm ảnh"}
      ariaLabel="Thêm ảnh vào album"
      disabled={uploader.pending || isFull}
      onPick={handlePick}
      className="bg-violet-600 text-white hover:bg-violet-700"
    >
      <ImageUp size={17} />
    </PhotoPickerButton>
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images size={18} className="text-sky-500" />
          <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Ảnh</h3>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 tabular dark:bg-stone-800 dark:text-stone-300">
            {photos.length}/{MAX_PHOTOS_PER_GAME}
          </span>
        </div>
        {photos.length > 0 && addButton}
      </div>

      {uploader.error && (
        <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{uploader.error}</p>
      )}
      {isFull && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
          Đã đủ {MAX_PHOTOS_PER_GAME} ảnh, xóa bớt ảnh cũ để thêm ảnh mới.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Đang tải ảnh...</p>
      ) : photos.length > 0 ? (
        <div className="max-h-[60vh] overflow-y-auto pr-0.5">
          <PhotoGrid photos={photos} expenseTitleById={expenseTitleById} onOpen={photoViewer.open} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-stone-300 p-6 text-center dark:border-stone-700">
          <Images size={28} className="text-stone-400" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Lưu ảnh hóa đơn, ảnh kỷ niệm của cả nhóm ở đây.
          </p>
          {addButton}
        </div>
      )}

      {photoViewer.viewer}
    </section>
  );
}
