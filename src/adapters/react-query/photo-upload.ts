import { useState } from "react";
import type { ApiPhoto } from "../../../shared/api-types";
import { MAX_PHOTOS_PER_GAME } from "../../../shared/schemas";
import { PHOTO_TOO_LARGE_ERROR, PHOTO_UNREADABLE_ERROR, preparePhoto } from "../browser/image";
import { useAddPhoto } from "./queries";

export const PHOTO_ERROR_MESSAGES: Record<string, string> = {
  [PHOTO_TOO_LARGE_ERROR]: "Ảnh quá nặng, thử chụp lại hoặc chọn ảnh nhỏ hơn.",
  [PHOTO_UNREADABLE_ERROR]: "Không đọc được ảnh này.",
  too_many_photos: `Mỗi cuộc chia chỉ lưu tối đa ${MAX_PHOTOS_PER_GAME} ảnh.`,
  invalid_input: "Ảnh không hợp lệ.",
};

export function toPhotoErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return PHOTO_ERROR_MESSAGES[code] || "Tải ảnh lên thất bại, thử lại sau.";
}

type UploadOptions = {
  /** Gan anh vao mot khoan chi; bo trong la anh chung cua cuoc chia. */
  expenseId?: string | null;
};

/**
 * Nen roi tai lan luot tung anh len server, bao tien do va loi dau tien gap
 * phai. Tra ve cac anh da luu thanh cong.
 */
export function usePhotoUploader(gameId: string) {
  const addPhoto = useAddPhoto(gameId);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  async function upload(files: File[], options: UploadOptions = {}) {
    if (files.length === 0) return [];

    setError("");
    setDone(0);
    setTotal(files.length);

    const uploaded: ApiPhoto[] = [];
    try {
      for (const file of files) {
        const prepared = await preparePhoto(file);
        const photo = await addPhoto.mutateAsync({
          ...prepared,
          caption: "",
          expenseId: options.expenseId ?? null,
        });
        uploaded.push(photo);
        setDone((value) => value + 1);
      }
    } catch (uploadError) {
      setError(toPhotoErrorMessage(uploadError));
    } finally {
      setTotal(0);
      setDone(0);
    }

    return uploaded;
  }

  return { upload, pending: total > 0, done, total, error, clearError: () => setError("") };
}
