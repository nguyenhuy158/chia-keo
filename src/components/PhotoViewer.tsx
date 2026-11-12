import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApiPhoto, ApiPhotoDetail } from "../../shared/api-types";
import { toDataUrl } from "../../shared/photos";
import { PHOTO_CAPTION_MAX_LENGTH } from "../../shared/schemas";
import { Input } from "../ui/Input";
import { Lightbox, LightboxButton } from "../ui/Lightbox";

type PhotoViewerProps = {
  photo: ApiPhoto;
  detail: ApiPhotoDetail | undefined;
  index: number;
  total: number;
  expenseTitle?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onDelete?: () => void;
  onSaveCaption?: (caption: string) => Promise<unknown>;
  pending?: boolean;
};

export function PhotoViewer({
  photo,
  detail,
  index,
  total,
  expenseTitle,
  onPrev,
  onNext,
  onClose,
  onDelete,
  onSaveCaption,
  pending = false,
}: PhotoViewerProps) {
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);

  useEffect(() => {
    setCaptionDraft(null);
  }, [photo.id]);

  async function handleSaveCaption() {
    if (!onSaveCaption || captionDraft === null) return;
    await onSaveCaption(captionDraft.trim());
    setCaptionDraft(null);
  }

  const source = detail
    ? toDataUrl(detail.mimeType, detail.data)
    : toDataUrl(photo.mimeType, photo.thumbData);
  const downloadName = `${(photo.caption || expenseTitle || "anh").replace(/[^\p{L}\d]+/gu, "-")}.jpg`;

  const actions = (
    <>
      <a
        href={source}
        download={downloadName}
        aria-label="Tải ảnh về máy"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 active:bg-white/25"
      >
        <Download size={20} />
      </a>
      {onDelete && (
        <LightboxButton label="Xóa ảnh" onClick={onDelete} disabled={pending}>
          <Trash2 size={20} />
        </LightboxButton>
      )}
    </>
  );

  const footer = (
    <>
      {expenseTitle && (
        <p className="text-center text-xs font-medium text-white/70">
          Hóa đơn: {expenseTitle}
        </p>
      )}
      {captionDraft === null ? (
        <div className="flex items-center justify-center gap-2">
          <p className="min-w-0 truncate text-center text-sm text-white/80">
            {photo.caption || (onSaveCaption ? "Chưa có chú thích" : "")}
          </p>
          {onSaveCaption && (
            <LightboxButton
              label="Sửa chú thích"
              onClick={() => setCaptionDraft(photo.caption)}
            >
              <Pencil size={16} />
            </LightboxButton>
          )}
        </div>
      ) : (
        <div className="mx-auto flex max-w-md items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveCaption();
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setCaptionDraft(null);
                }
              }}
              maxLength={PHOTO_CAPTION_MAX_LENGTH}
              autoFocus
              placeholder="Chú thích ảnh"
            />
          </div>
          <LightboxButton
            label="Lưu chú thích"
            onClick={handleSaveCaption}
            disabled={pending}
          >
            <Check size={20} />
          </LightboxButton>
          <LightboxButton
            label="Hủy sửa chú thích"
            onClick={() => setCaptionDraft(null)}
          >
            <X size={20} />
          </LightboxButton>
        </div>
      )}
    </>
  );

  return (
    <Lightbox
      open
      src={source}
      alt={photo.caption || expenseTitle || "Ảnh cuộc chia"}
      index={index}
      total={total}
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      loading={!detail}
      actions={actions}
      footer={footer}
    />
  );
}
