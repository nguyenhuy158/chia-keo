import { Paperclip } from "lucide-react";
import type { ApiPhoto } from "../../shared/api-types";
import { toDataUrl } from "../../shared/photos";

type PhotoGridProps = {
  photos: ApiPhoto[];
  /** Ten khoan chi de gan nhan len anh hoa don. */
  expenseTitleById?: Map<string, string>;
  onOpen: (index: number) => void;
};

/** Luoi anh vuong, bam vao mot o de mo che do xem toan man hinh. */
export function PhotoGrid({ photos, expenseTitleById, onOpen }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo, index) => {
        const expenseTitle = photo.expenseId ? expenseTitleById?.get(photo.expenseId) : undefined;

        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(index)}
            className="group relative aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100 transition active:scale-[0.98] dark:border-stone-800 dark:bg-stone-800"
            aria-label={photo.caption || expenseTitle || `Ảnh ${index + 1}`}
          >
            <img
              src={toDataUrl(photo.mimeType, photo.thumbData)}
              alt={photo.caption || expenseTitle || ""}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {expenseTitle && (
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-stone-950/60 px-1.5 py-1 text-[10px] font-medium text-white">
                <Paperclip size={10} className="shrink-0" />
                <span className="truncate">{expenseTitle}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
