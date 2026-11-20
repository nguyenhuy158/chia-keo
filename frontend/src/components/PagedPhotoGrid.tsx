import type { ReactNode } from "react";
import type { ApiPhoto } from "../../../shared/api-types";
import { toDataUrl } from "../../../shared/photos";
import { PagedList } from "../ui/PagedList";

const PHOTOS_PER_ROW = 3;
const ROW_HEIGHT_PX = 104;

type PhotoRow = {
  id: string;
  photos: Array<{ photo: ApiPhoto; index: number }>;
};

function toPhotoRows(photos: ApiPhoto[]) {
  const rows: PhotoRow[] = [];
  photos.forEach((photo, index) => {
    if (index % PHOTOS_PER_ROW === 0) {
      rows.push({ id: photo.id, photos: [] });
    }
    rows[rows.length - 1].photos.push({ photo, index });
  });
  return rows;
}

type PagedPhotoGridProps = {
  photos: ApiPhoto[];
  expenseTitleById?: Map<string, string>;
  onOpen: (index: number) => void;
  empty?: ReactNode;
};

/** Luoi anh vuot chia trang: moi hang ba anh, khong cuon, dung cho man hinh dien thoai. */
export function PagedPhotoGrid({
  photos,
  expenseTitleById,
  onOpen,
  empty,
}: PagedPhotoGridProps) {
  return (
    <PagedList
      items={toPhotoRows(photos)}
      getKey={(row) => row.id}
      rowHeight={ROW_HEIGHT_PX}
      empty={empty}
      renderItem={(row) => (
        <div className="grid h-full grid-cols-3 gap-2">
          {row.photos.map(({ photo, index }) => {
            const expenseTitle = photo.expenseId
              ? expenseTitleById?.get(photo.expenseId)
              : undefined;
            const label = photo.caption || expenseTitle || `Ảnh ${index + 1}`;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpen(index)}
                aria-label={label}
                className="overflow-hidden rounded-md border border-border bg-stone-100 transition active:scale-[0.98] dark:bg-stone-800"
              >
                <img
                  src={toDataUrl(photo.mimeType, photo.thumbData)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    />
  );
}
