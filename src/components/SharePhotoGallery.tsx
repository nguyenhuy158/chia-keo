import { Images } from "lucide-react";
import { useState } from "react";
import type { ApiExpense } from "../../shared/api-types";
import { stepPhotoIndex } from "../../shared/photos";
import { useSharePhoto, useSharePhotos } from "../adapters/react-query/queries";
import { PhotoGrid } from "./PhotoGrid";
import { PhotoViewer } from "./PhotoViewer";
import { EmptyState, SkeletonPhotoGrid } from "./ui";

type SharePhotoGalleryProps = {
  token: string;
  expenses: ApiExpense[];
};

/** Album anh chi doc cho nguoi xem qua link chia se. */
export function SharePhotoGallery({ token, expenses }: SharePhotoGalleryProps) {
  const photosQuery = useSharePhotos(token);
  const [index, setIndex] = useState(-1);

  const photos = photosQuery.data || [];
  const photo = index >= 0 ? photos[index] : undefined;
  const detail = useSharePhoto(token, photo?.id || "");
  const expenseTitleById = new Map(expenses.map((expense) => [expense.id, expense.title]));

  if (photosQuery.isPending) return <SkeletonPhotoGrid count={8} />;

  if (photos.length === 0) {
    return (
      <EmptyState title="Chưa có ảnh" description="Cuộc chia này chưa có ảnh nào được thêm." />
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <Images size={18} className="text-sky-500" />
        <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
          Ảnh ({photos.length})
        </h2>
      </div>

      <PhotoGrid photos={photos} expenseTitleById={expenseTitleById} onOpen={setIndex} />

      {photo && (
        <PhotoViewer
          photo={photo}
          detail={detail.data}
          index={index}
          total={photos.length}
          expenseTitle={photo.expenseId ? expenseTitleById.get(photo.expenseId) : undefined}
          onPrev={() => setIndex(stepPhotoIndex(index, -1, photos.length))}
          onNext={() => setIndex(stepPhotoIndex(index, 1, photos.length))}
          onClose={() => setIndex(-1)}
        />
      )}
    </section>
  );
}
