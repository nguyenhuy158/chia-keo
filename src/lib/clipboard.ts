const IMAGE_MIME = "image/png";

/**
 * Copy text ra clipboard. Safari cu va cac tab chay tren http khong co
 * `navigator.clipboard`, nen fallback qua textarea an + execCommand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Bi tu choi quyen hoac khong o secure context, thu tiep fallback ben duoi.
  }

  return copyWithTextarea(text);
}

function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  try {
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Copy anh ra clipboard. Nhan thang Promise<Blob> vi Safari huy quyen clipboard
 * neu ta await truoc khi goi `write`; Firefox chua ho tro nen se tra ve false
 * va phia goi can fallback sang tai anh ve.
 */
export async function copyImage(blob: Promise<Blob>): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return false;
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ [IMAGE_MIME]: blob })]);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
