import { buildSummaryDocument, type SummaryTextInput } from "../../shared/summary-text";

const IMAGE_MIME = "image/png";
/** Ve o do phan giai gap doi cho net tren man hinh retina va khi zoom. */
const PIXEL_SCALE = 2;
const CARD_WIDTH = 760;
const PADDING = 36;
const ACCENT_BAR_HEIGHT = 6;
const WRAP_INDENT = 18;

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/**
 * Anh luon dung bang mau sang du app dang o dark mode: anh se duoc dan sang
 * Zalo/Messenger nen doc tren nen sang la an toan nhat.
 */
const COLOR = {
  background: "#ffffff",
  accent: "#7c3aed",
  title: "#0c0a09",
  subtitle: "#7c3aed",
  heading: "#6d28d9",
  body: "#1c1917",
  muted: "#78716c",
  divider: "#e7e5e4",
} as const;

type TextStyle = {
  font: string;
  color: string;
  lineHeight: number;
  gapBefore: number;
};

const STYLE = {
  title: { font: `700 27px ${FONT_STACK}`, color: COLOR.title, lineHeight: 34, gapBefore: 0 },
  subtitle: { font: `600 14px ${FONT_STACK}`, color: COLOR.subtitle, lineHeight: 22, gapBefore: 2 },
  heading: { font: `700 15px ${FONT_STACK}`, color: COLOR.heading, lineHeight: 24, gapBefore: 22 },
  body: { font: `400 15px ${FONT_STACK}`, color: COLOR.body, lineHeight: 23, gapBefore: 0 },
  footer: { font: `400 13px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 20, gapBefore: 24 },
} satisfies Record<string, TextStyle>;

type LaidOutLine = {
  text: string;
  style: TextStyle;
  indent: number;
  gapBefore: number;
};

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  maxWidth: number,
): string[] {
  context.font = style.font;
  if (context.measureText(text).width <= maxWidth) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const limit = lines.length === 0 ? maxWidth : maxWidth - WRAP_INDENT;

    if (current && context.measureText(candidate).width > limit) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function layout(input: SummaryTextInput, context: CanvasRenderingContext2D): LaidOutLine[] {
  const doc = buildSummaryDocument(input);
  const maxWidth = CARD_WIDTH - PADDING * 2;
  const lines: LaidOutLine[] = [];

  function push(text: string, style: TextStyle) {
    const wrapped = wrapText(context, text, style, maxWidth);
    wrapped.forEach((part, index) => {
      lines.push({
        text: part,
        style,
        indent: index === 0 ? 0 : WRAP_INDENT,
        gapBefore: index === 0 ? style.gapBefore : 0,
      });
    });
  }

  push(doc.title, STYLE.title);
  push(doc.subtitle, STYLE.subtitle);

  for (const section of doc.sections) {
    push(section.heading, STYLE.heading);
    for (const line of section.lines) push(line, STYLE.body);
  }

  if (doc.footer) push(doc.footer, STYLE.footer);

  return lines;
}

function createContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width * PIXEL_SCALE;
  canvas.height = height * PIXEL_SCALE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trinh duyet khong ho tro canvas 2d");
  context.scale(PIXEL_SCALE, PIXEL_SCALE);

  return { canvas, context };
}

/**
 * Ve ban tom tat ra mot the canvas roi xuat PNG. Lam thu cong thay vi dung
 * thu vien chup DOM vi noi dung chi la cac dong chu, va tranh them dependency.
 */
export async function renderSummaryImage(input: SummaryTextInput): Promise<Blob> {
  const measure = createContext(1, 1);
  const lines = layout(input, measure.context);

  const contentHeight = lines.reduce(
    (total, line) => total + line.gapBefore + line.style.lineHeight,
    0,
  );
  const cardHeight = ACCENT_BAR_HEIGHT + PADDING * 2 + contentHeight;

  const { canvas, context } = createContext(CARD_WIDTH, cardHeight);

  context.fillStyle = COLOR.background;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);
  context.fillStyle = COLOR.accent;
  context.fillRect(0, 0, CARD_WIDTH, ACCENT_BAR_HEIGHT);

  context.textBaseline = "alphabetic";
  let y = ACCENT_BAR_HEIGHT + PADDING;

  for (const line of lines) {
    y += line.gapBefore;

    // Ke mot vach mo phia tren moi tieu de phan de tach khoi cho de nhin.
    if (line.style === STYLE.heading && line.gapBefore > 0) {
      context.fillStyle = COLOR.divider;
      context.fillRect(PADDING, y - line.gapBefore / 2, CARD_WIDTH - PADDING * 2, 1);
    }

    context.font = line.style.font;
    context.fillStyle = line.style.color;
    context.fillText(line.text, PADDING + line.indent, y + line.style.lineHeight * 0.75);
    y += line.style.lineHeight;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Khong tao duoc anh tu canvas"));
    }, IMAGE_MIME);
  });
}

export function buildSummaryImageFileName(input: SummaryTextInput) {
  return `chia-keo-${input.code}.png`;
}
