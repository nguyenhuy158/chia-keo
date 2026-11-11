import {
  SHARE_PREVIEW_HEIGHT,
  SHARE_PREVIEW_MIME_TYPE,
  SHARE_PREVIEW_WIDTH,
} from "../../../shared/schemas";
import type { SummaryTextInput } from "../../../shared/summary-text";
import { renderSummaryImage } from "./summary-image";

const SHARE_PREVIEW_QUALITY = 0.85;

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas
    .toDataURL(SHARE_PREVIEW_MIME_TYPE, SHARE_PREVIEW_QUALITY)
    .split(",")[1];
}

export async function renderSharePreviewImage(
  input: SummaryTextInput,
  backgroundId?: string,
): Promise<string> {
  const card = await createImageBitmap(
    await renderSummaryImage(input, "compact", backgroundId, false, true),
  );
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_PREVIEW_WIDTH;
  canvas.height = SHARE_PREVIEW_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trinh duyet khong ho tro canvas 2d");

  const scale = Math.max(
    SHARE_PREVIEW_WIDTH / card.width,
    SHARE_PREVIEW_HEIGHT / card.height,
  );
  const width = card.width * scale;
  context.drawImage(
    card,
    (SHARE_PREVIEW_WIDTH - width) / 2,
    0,
    width,
    card.height * scale,
  );
  card.close();

  return canvasToBase64(canvas);
}
