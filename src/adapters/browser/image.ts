// Adapter trinh duyet: nen anh bang canvas truoc khi gui len API.

import {
  PHOTO_DATA_MAX_LENGTH,
  PHOTO_MAX_EDGE,
  PHOTO_THUMB_DATA_MAX_LENGTH,
  PHOTO_THUMB_MAX_EDGE,
} from "../../../shared/schemas";

/** Anh luon duoc nen ve JPEG de dung chung mot duong xu ly. */
const OUTPUT_MIME_TYPE = "image/jpeg";
/** Ha dan chat luong den khi base64 nam duoi gioi han cua server. */
const FULL_QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];
const THUMB_QUALITY_STEPS = [0.68, 0.55, 0.42];

export const PHOTO_TOO_LARGE_ERROR = "photo_too_large";
export const PHOTO_UNREADABLE_ERROR = "photo_unreadable";

export type PreparedPhoto = {
  mimeType: typeof OUTPUT_MIME_TYPE;
  data: string;
  thumbData: string;
  width: number;
  height: number;
};

type Size = { width: number; height: number };

type DrawableImage = CanvasImageSource & Size;

/** Thu nho theo canh dai nhat, khong bao gio phong to anh goc. */
function scaleToFit(size: Size, maxEdge: number): Size {
  const longestEdge = Math.max(size.width, size.height);
  if (longestEdge <= maxEdge) return size;

  const ratio = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  };
}

function drawToCanvas(image: DrawableImage, size: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error(PHOTO_UNREADABLE_ERROR);
  // Nen JPEG khong co kenh alpha; to trang truoc de anh PNG trong suot khong den.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);

  return canvas;
}

/** Base64 nho nhat trong cac muc chat luong ma van duoi `maxLength`. */
function encodeWithinLimit(canvas: HTMLCanvasElement, qualities: number[], maxLength: number) {
  for (const quality of qualities) {
    const base64 = canvas.toDataURL(OUTPUT_MIME_TYPE, quality).split(",")[1] || "";
    if (base64.length > 0 && base64.length <= maxLength) return base64;
  }
  return null;
}

async function loadImage(file: File): Promise<DrawableImage> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Trinh duyet cu khong ho tro createImageBitmap voi options.
    return await loadImageElement(file);
  }
}

function loadImageElement(file: File): Promise<DrawableImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(Object.assign(image, { width: image.naturalWidth, height: image.naturalHeight }));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(PHOTO_UNREADABLE_ERROR));
    };
    image.src = url;
  });
}

/**
 * Nen anh nguoi dung chon thanh anh goc (canh dai toi da PHOTO_MAX_EDGE) va
 * anh thu nho cho luoi anh, ca hai duoi dang base64 de gui thang len API.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const image = await loadImage(file);
  const fullSize = scaleToFit({ width: image.width, height: image.height }, PHOTO_MAX_EDGE);
  const thumbSize = scaleToFit(fullSize, PHOTO_THUMB_MAX_EDGE);

  const data = encodeWithinLimit(
    drawToCanvas(image, fullSize),
    FULL_QUALITY_STEPS,
    PHOTO_DATA_MAX_LENGTH,
  );
  const thumbData = encodeWithinLimit(
    drawToCanvas(image, thumbSize),
    THUMB_QUALITY_STEPS,
    PHOTO_THUMB_DATA_MAX_LENGTH,
  );

  if ("close" in image) image.close();
  if (!data || !thumbData) throw new Error(PHOTO_TOO_LARGE_ERROR);

  return {
    mimeType: OUTPUT_MIME_TYPE,
    data,
    thumbData,
    width: fullSize.width,
    height: fullSize.height,
  };
}
