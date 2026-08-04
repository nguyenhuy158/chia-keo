import type { ApiParticipant } from "../../../shared/api-types";
import {
  buildSummaryDocument,
  formatThousands,
  type SummaryDocument,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../../shared/summary-text";
import { buildVietQrProxyPath, canBuildVietQr, getVietQrBankLabel } from "../../../shared/vietqr";
import { API_BASE } from "./http-game-api";

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
/** Truyen 0 cho VietQR de QR khong gan san so tien, nguoi quet tu nhap. */
const QR_AMOUNT_FREE = 0;
const FONT_LOAD_TIMEOUT_MS = 3_000;

/**
 * Poppins khong co subset vietnamese (Google Fonts chi phuc vu latin,
 * latin-ext, devanagari), nen cac nguyen am co dau kieu "ệ ử ồ ẩ" roi xuong
 * "Be Vietnam Pro" ngay sau. Doi thu tu hai ten nay la doi luon font cua anh.
 */
const IMAGE_FONT_FAMILIES = ["Poppins", "Be Vietnam Pro"] as const;
const FONT_WEIGHTS = [400, 600, 700] as const;

const FONT_STACK = `${IMAGE_FONT_FAMILIES.map((name) => `"${name}"`).join(", ")}, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

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
  qrNote: { font: `600 15px ${FONT_STACK}`, color: COLOR.accent, lineHeight: 24, gapBefore: 0 },
  qrDetail: { font: `400 14px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 21, gapBefore: 0 },
  footer: { font: `400 13px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 20, gapBefore: 24 },
  /** Dong nhom trong phan chuyen tien cua ban chi tiet, vi du "Chuyen vao X". */
  groupLabel: { font: `600 14px ${FONT_STACK}`, color: COLOR.muted, lineHeight: 24, gapBefore: 6 },
} satisfies Record<string, TextStyle>;

type Block = {
  height: number;
  gapBefore: number;
  draw: (context: CanvasRenderingContext2D, y: number) => void;
};

type QrLine = readonly [string, TextStyle];

type QrCard = {
  image: HTMLImageElement;
  lines: QrLine[];
};

type QrCards = {
  /** QR rieng cho tung dong o che do p2p, khoa la vi tri dong. */
  byLineIndex: Map<number, QrCard>;
  /** QR duy nhat cua host o che do gom mot dau moi. */
  host: QrCard | null;
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

async function loadQrImage(payee: ApiParticipant, amount: number, code: string) {
  if (!canBuildVietQr(payee)) return null;
  return loadImage(`${API_BASE}${buildVietQrProxyPath(payee, amount, code)}`);
}

function buildAccountLines(payee: ApiParticipant): QrLine[] {
  const detail = [getVietQrBankLabel(payee.bankId), payee.accountNo].filter(Boolean).join(" · ");
  return [
    [detail, STYLE.qrDetail],
    [payee.accountName || payee.name, STYLE.qrDetail],
  ];
}

/**
 * Tai truoc QR cho phan chuyen tien. Nguoi nhan chua nhap tai khoan hoac anh
 * tai loi thi bo qua, phan do van hien lai bang dong chu nhu cu.
 */
async function loadQrCards(input: SummaryTextInput, doc: SummaryDocument): Promise<QrCards> {
  const participantById = new Map<string, ApiParticipant>(
    input.participants.map((participant) => [participant.id, participant]),
  );

  if (doc.hostParticipantId) {
    const host = participantById.get(doc.hostParticipantId);
    const image = host ? await loadQrImage(host, QR_AMOUNT_FREE, input.code) : null;

    return {
      byLineIndex: new Map(),
      host:
        image && host
          ? {
              image,
              lines: [
                [`Chuyển cho ${host.name}`, STYLE.qrTitle],
                ["Quét rồi tự nhập số tiền", STYLE.qrNote],
                ...buildAccountLines(host),
              ],
            }
          : null,
    };
  }

  const loaded = await Promise.all(
    input.summary.settlements.map(async (settlement, index) => {
      const from = participantById.get(settlement.fromParticipantId);
      const to = participantById.get(settlement.toParticipantId);
      if (!from || !to) return null;

      const image = await loadQrImage(to, settlement.amount, input.code);
      if (!image) return null;

      return [
        index,
        {
          image,
          lines: [
            [`${from.name} → ${to.name}`, STYLE.qrTitle],
            [`${formatThousands(settlement.amount)}k`, STYLE.qrAmount],
            ...buildAccountLines(to),
          ] as QrLine[],
        },
      ] as const;
    }),
  );

  return { byLineIndex: new Map(loaded.filter((entry) => entry !== null)), host: null };
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

function buildQrBlock(card: QrCard): Block {
  const textX = PADDING + QR_SIZE + QR_TEXT_GAP;
  const textHeight = card.lines.reduce((total, [, style]) => total + style.lineHeight, 0);

  return {
    height: QR_SIZE,
    gapBefore: QR_BLOCK_GAP,
    draw(context, y) {
      context.strokeStyle = COLOR.qrFrame;
      context.lineWidth = 1;
      context.strokeRect(PADDING + 0.5, y + 0.5, QR_SIZE - 1, QR_SIZE - 1);
      context.drawImage(card.image, PADDING, y, QR_SIZE, QR_SIZE);

      let textY = y + (QR_SIZE - textHeight) / 2;
      for (const [text, style] of card.lines) {
        drawText(context, text, style, textX, textY);
        textY += style.lineHeight;
      }
    },
  };
}

function buildBlocks(
  doc: SummaryDocument,
  context: CanvasRenderingContext2D,
  qrCards: QrCards,
): Block[] {
  const blocks: Block[] = [
    ...buildTextBlocks(context, doc.title, STYLE.title),
    ...buildTextBlocks(context, doc.subtitle, STYLE.subtitle),
  ];

  for (const section of doc.sections) {
    blocks.push(...buildTextBlocks(context, section.heading, STYLE.heading, { withDivider: true }));

    if (section.id === "settlements" && qrCards.host) {
      blocks.push(buildQrBlock(qrCards.host));
    }

    section.lines.forEach((line, index) => {
      const card = section.id === "settlements" ? qrCards.byLineIndex.get(index) : undefined;
      if (card) {
        blocks.push(buildQrBlock(card));
        return;
      }

      // Ban chi tiet chen dong nhom ("Chuyen vao X — tong ...:") giua cac dong
      // chuyen tien; khong danh dau thi no lan vao nhu mot luot chuyen nua.
      const isGroupLabel = section.id === "settlements" && !line.startsWith("- ");
      blocks.push(...buildTextBlocks(context, line, isGroupLabel ? STYLE.groupLabel : STYLE.body));
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
 * Canvas khong tu tai webfont: font chi duoc fetch khi co the DOM dung den, ma
 * anh thi ve ngoai DOM. Khong goi fonts.load truoc thi measureText va fillText
 * am tham roi ve font he thong, anh ra khac han app. Loi hoac cham qua thi bo
 * qua, anh van ve duoc bang font du phong.
 */
async function ensureImageFontsReady() {
  const fonts = document.fonts;
  if (!fonts?.load) return;

  const requests = IMAGE_FONT_FAMILIES.flatMap((name) =>
    FONT_WEIGHTS.map((weight) => fonts.load(`${weight} 16px "${name}"`)),
  );

  try {
    await Promise.race([
      Promise.all(requests),
      new Promise((resolve) => window.setTimeout(resolve, FONT_LOAD_TIMEOUT_MS)),
    ]);
  } catch {
    // Font tai loi thi van ve tiep, chi la anh dung font du phong.
  }
}

/**
 * Ve ban tom tat ra mot the canvas roi xuat PNG. Lam thu cong thay vi dung
 * thu vien chup DOM vi noi dung chi la cac dong chu, va tranh them dependency.
 */
export async function renderSummaryImage(
  input: SummaryTextInput,
  variant: SummaryVariant = "compact",
): Promise<Blob> {
  const doc = buildSummaryDocument(input, variant);
  // Font phai san sang truoc khi do chu, khong thi wrapText do bang font sai.
  const [, qrCards] = await Promise.all([ensureImageFontsReady(), loadQrCards(input, doc)]);

  const measure = createContext(1, 1);
  const blocks = buildBlocks(doc, measure.context, qrCards);

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

export function buildSummaryImageFileName(
  input: SummaryTextInput,
  variant: SummaryVariant = "compact",
) {
  const suffix = variant === "detailed" ? "-chi-tiet" : "";
  return `chia-keo-${input.code}${suffix}.png`;
}
