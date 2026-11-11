import {
  SHARE_PREVIEW_HEIGHT,
  SHARE_PREVIEW_MIME_TYPE,
  SHARE_PREVIEW_WIDTH,
} from "../../../shared/schemas";
import type { SharePageMeta } from "../core/application/share-links";

const SITE_NAME = "Chia Kèo";
const SHARE_DESCRIPTION = "Xem ai trả ai bao nhiêu";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
};

export function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&"<>']/g, (char) => HTML_ESCAPES[char]);
}

function metaTag(
  attribute: "property" | "name",
  key: string,
  content: string,
): string {
  return `<meta ${attribute}="${key}" content="${escapeHtmlAttribute(content)}" />`;
}

export function buildShareMetaTags(
  meta: SharePageMeta,
  pageUrl: string,
): string {
  const url = new URL(pageUrl);
  const shareUrl = `${url.origin}${url.pathname}`;
  const title = `${meta.name} · ${SITE_NAME}`;
  const tags = [
    metaTag("property", "og:type", "website"),
    metaTag("property", "og:site_name", SITE_NAME),
    metaTag("property", "og:title", title),
    metaTag("property", "og:description", SHARE_DESCRIPTION),
    metaTag("property", "og:url", shareUrl),
    metaTag("name", "description", SHARE_DESCRIPTION),
  ];

  if (meta.previewVersion) {
    const imageUrl = `${url.origin}/api${url.pathname}/preview.jpg?v=${encodeURIComponent(meta.previewVersion)}`;
    tags.push(
      metaTag("property", "og:image", imageUrl),
      metaTag("property", "og:image:type", SHARE_PREVIEW_MIME_TYPE),
      metaTag("property", "og:image:width", String(SHARE_PREVIEW_WIDTH)),
      metaTag("property", "og:image:height", String(SHARE_PREVIEW_HEIGHT)),
      metaTag("name", "twitter:card", "summary_large_image"),
      metaTag("name", "twitter:image", imageUrl),
    );
  }

  return tags.join("");
}
