import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ApiPhoto } from "../../shared/api-types";
import { indexAfterRemove, stepPhotoIndex } from "../../shared/photos";
import { usePhoto, useRemovePhoto, useUpdatePhoto } from "../adapters/react-query/queries";
import { PhotoViewer } from "./PhotoViewer";
import { useConfirm } from "./ConfirmDialog";

type PhotoViewerHost = {
  /** Mo anh tai vi tri `index` trong danh sach da truyen vao. */
  open: (index: number) => void;
  /** Lop xem toan man hinh, render o bat ky dau trong cay component. */
  viewer: ReactNode;
};

/**
 * Gan che do xem anh toan man hinh (kem sua chu thich va xoa) vao mot danh
 * sach anh bat ky: album cua cuoc chia hoac anh cua rieng mot khoan chi.
 */
export function usePhotoViewer(
  gameId: string,
  photos: ApiPhoto[],
  expenseTitleById?: Map<string, string>,
): PhotoViewerHost {
  const confirm = useConfirm();
  const updatePhoto = useUpdatePhoto(gameId);
  const removePhoto = useRemovePhoto(gameId);
  const [index, setIndex] = useState(-1);

  const photo = index >= 0 ? photos[index] : undefined;
  const detail = usePhoto(photo?.id || "");

  async function handleDelete() {
    if (!photo) return;
    if (!(await confirm({ title: "Xóa ảnh này?", destructive: true }))) return;

    await removePhoto.mutateAsync(photo.id);
    setIndex(indexAfterRemove(index, photos.length - 1));
    toast.success("Đã xóa ảnh");
  }

  return {
    open: setIndex,
    viewer: photo ? (
      <PhotoViewer
        photo={photo}
        detail={detail.data}
        index={index}
        total={photos.length}
        expenseTitle={photo.expenseId ? expenseTitleById?.get(photo.expenseId) : undefined}
        onPrev={() => setIndex(stepPhotoIndex(index, -1, photos.length))}
        onNext={() => setIndex(stepPhotoIndex(index, 1, photos.length))}
        onClose={() => setIndex(-1)}
        onDelete={handleDelete}
        onSaveCaption={(caption) =>
          updatePhoto.mutateAsync({ photoId: photo.id, input: { caption } })
        }
        pending={updatePhoto.isPending || removePhoto.isPending}
      />
    ) : null,
  };
}
