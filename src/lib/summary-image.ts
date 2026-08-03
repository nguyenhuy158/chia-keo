import type { ApiParticipant } from "../../shared/api-types";
import {
  buildSummaryDocument,
  formatThousands,
  type SummaryTextInput,
} from "../../shared/summary-text";
import {
  buildVietQrProxyPath,
  canBuildVietQr,
  getVietQrBankLabel,
} from "../../shared/vietqr";
import { API_BASE } from "./api";

const IMAGE_MIME = "image/png";
/** Ve o do phan giai gap doi cho net tren man hinh retina va khi zoom. */
const PIXEL_SCALE = 2;
const CARD_WIDTH = 760;
const PADDING = 36;
const ACCENT_BAR_HEIGHT = 6;
const WRAP_INDENT = 18;
const QR_SIZE = 168;
const QR_TEXT_GAP = 20;
const QR_BLOCK_GAP = 16;
const QR_LOAD_TIMEOUT_MS = 8_000;

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
  qrFrame: "#e7e5e4",
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
  qrTitle: { font: `700 18px ${FONT_STACK}`, color: COLOR.title, lineHeight: 26, gapBefore: 0 },
  qrAmount: { font: `700 22px ${FONT_STACK}`, color: COLOR.accent, lineHeight: 32, gapBefore: 0 },
  qrDetail: { font: `400 14px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 21, gapBefore: 0 },
  footer: { font: `400 13px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 20, gapBefore: 24 },
} satisfies Record<string, TextStyle>;

type Block = {
  height: number;
  gapBefore: number;
  draw: (context: CanvasRenderingContext2D, y: number) => void;
};

type SettlementQr = {
  image: HTMLImageElement;
  title: string;
  amount: string;
  bankLine: string;
  nameLine: string;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Bat buoc de canvas khong bi taint khi API o origin khac (VITE_API_URL).
    image.crossOrigin = "anonymous";

    const timer = window.setTimeout(() => resolve(null), QR_LOAD_TIMEOUT_MS);
    function settle(value: HTMLImageElement | null) {
      window.clearTimeout(timer);
      resolve(value);
    }

    image.onload = () => settle(image);
    image.onerror = () => settle(null);
    image.src = src;
  });
}

/**
 * Tai truoc QR cua tung khoan chuyen tien. Nguoi nhan chua nhap tai khoan hoac
 * anh tai loi thi bo qua, phan do se hien lai bang dong chu nhu cu.
 */
async function loadSettlementQrs(input: SummaryTextInput): Promise<Map<number, SettlementQr>> {
  const participantById = new Map<string, ApiParticipant>(
    input.participants.map((participant) => [participant.id, participant]),
  );

  const candidates = input.summary.settlements.map((settlement, index) => {
    const from = participantById.get(settlement.fromParticipantId);
    const to = participantById.get(settlement.toParticipantId);
    return { index, settlement, from, to };
  });

  const loaded = await Promise.all(
    candidates.map(async ({ index, settlement, from, to }) => {
      if (!from || !to || !canBuildVietQr(to)) return null;

      const src = `${API_BASE}${buildVietQrProxyPath(to, settlement.amount, input.code)}`;
      const image = await loadImage(src);
      if (!image) return null;

      const detail = [getVietQrBankLabel(to.bankId), to.accountNo].filter(Boolean).join(" · ");
      return [
        index,
        {
          image,
          title: `${from.name} → ${to.name}`,
          amount: `${formatThousands(settlement.amount)}k`,
          bankLine: detail,
          nameLine: to.accountName || to.name,
        },
      ] as const;
    }),
  );

  return new Map(loaded.filter((entry) => entry !== null));
}

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

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  x: number,
  y: number,
) {
  context.font = style.font;
  context.fillStyle = style.color;
  context.fillText(text, x, y + style.lineHeight * 0.75);
}

function buildTextBlocks(
  context: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  options: { withDivider?: boolean } = {},
): Block[] {
  const maxWidth = CARD_WIDTH - PADDING * 2;

  return wrapText(context, text, style, maxWidth).map((part, index) => {
    const gapBefore = index === 0 ? style.gapBefore : 0;
    const x = PADDING + (index === 0 ? 0 : WRAP_INDENT);

    return {
      height: style.lineHeight,
      gapBefore,
      draw(target, y) {
        if (options.withDivider && index === 0 && gapBefore > 0) {
          target.fillStyle = COLOR.divider;
          target.fillRect(PADDING, y - gapBefore / 2, CARD_WIDTH - PADDING * 2, 1);
        }
        drawText(target, part, style, x, y);
      },
    };
  });
}

function buildQrBlock(qr: SettlementQr): Block {
  const textX = PADDING + QR_SIZE + QR_TEXT_GAP;

  return {
    height: QR_SIZE,
    gapBefore: QR_BLOCK_GAP,
    draw(context, y) {
      context.strokeStyle = COLOR.qrFrame;
      context.lineWidth = 1;
      context.strokeRect(PADDING + 0.5, y + 0.5, QR_SIZE - 1, QR_SIZE - 1);
      context.drawImage(qr.image, PADDING, y, QR_SIZE, QR_SIZE);

      let textY = y + (QR_SIZE - STYLE.qrTitle.lineHeight - STYLE.qrAmount.lineHeight - STYLE.qrDetail.lineHeight * 2) / 2;
      for (const [text, style] of [
        [qr.title, STYLE.qrTitle],
        [qr.amount, STYLE.qrAmount],
        [qr.bankLine, STYLE.qrDetail],
        [qr.nameLine, STYLE.qrDetail],
      ] as const) {
        drawText(context, text, style, textX, textY);
        textY += style.lineHeight;
      }
    },
  };
}

function buildBlocks(
  input: SummaryTextInput,
  context: CanvasRenderingContext2D,
  qrByIndex: Map<number, SettlementQr>,
): Block[] {
  const doc = buildSummaryDocument(input);
  const blocks: Block[] = [
    ...buildTextBlocks(context, doc.title, STYLE.title),
    ...buildTextBlocks(context, doc.subtitle, STYLE.subtitle),
  ];

  for (const section of doc.sections) {
    blocks.push(...buildTextBlocks(context, section.heading, STYLE.heading, { withDivider: true }));

    section.lines.forEach((line, index) => {
      const qr = section.id === "settlements" ? qrByIndex.get(index) : undefined;
      if (qr) blocks.push(buildQrBlock(qr));
      else blocks.push(...buildTextBlocks(context, line, STYLE.body));
    });
  }

  if (doc.footer) blocks.push(...buildTextBlocks(context, doc.footer, STYLE.footer));

  return blocks;
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
  const qrByIndex = await loadSettlementQrs(input);

  const measure = createContext(1, 1);
  const blocks = buildBlocks(input, measure.context, qrByIndex);

  const contentHeight = blocks.reduce((total, block) => total + block.gapBefore + block.height, 0);
  const cardHeight = ACCENT_BAR_HEIGHT + PADDING * 2 + contentHeight;

  const { canvas, context } = createContext(CARD_WIDTH, cardHeight);

  context.fillStyle = COLOR.background;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);
  context.fillStyle = COLOR.accent;
  context.fillRect(0, 0, CARD_WIDTH, ACCENT_BAR_HEIGHT);
  context.textBaseline = "alphabetic";

  let y = ACCENT_BAR_HEIGHT + PADDING;
  for (const block of blocks) {
    y += block.gapBefore;
    block.draw(context, y);
    y += block.height;
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
