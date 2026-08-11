import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";
import type { ApiParticipant } from "../../../shared/api-types";
import { normalizeContactName } from "../../../shared/contacts";
import {
  buildSummaryDocument,
  formatThousands,
  type SummaryDocument,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../../shared/summary-text";
import { buildVietQrProxyPath, canBuildVietQr, getVietQrBankLabel } from "../../../shared/vietqr";
import { API_BASE } from "./http-game-api";
import {
  getSummaryImageBackground,
  type SummaryImagePalette,
} from "./summary-image-backgrounds";

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
/** Vien trang lot quanh QR khi nen anh toi. */
const QR_MAT_PADDING = 10;
const QR_LOAD_TIMEOUT_MS = 8_000;
/** Duong kinh avatar ve truoc ten tung nguoi (o phan "TỪNG NGƯỜI"). */
const AVATAR_SIZE = 20;
const AVATAR_TEXT_GAP = 8;
/** Truyen 0 cho VietQR de QR khong gan san so tien, nguoi quet tu nhap. */
const QR_AMOUNT_FREE = 0;
const FONT_LOAD_TIMEOUT_MS = 3_000;

/**
 * Dung dung font cua app (xem :root trong styles.css) de anh khong lech mat
 * chu so voi man hinh. Ca hai font deu co subset vietnamese, nen moi ky tu co
 * dau deu ra tu cung mot font chu khong bi vay muon lung tung.
 */
const IMAGE_FONT_FAMILIES = ["Be Vietnam Pro", "Plus Jakarta Sans"] as const;
const FONT_WEIGHTS = [400, 600, 700] as const;
/**
 * Google Fonts cat font thanh nhieu @font-face theo unicode-range, va
 * fonts.load chi tai nhung mieng phu duoc chu truyen vao. Khong truyen gi thi
 * no lay dau cach, tuc chi co subset latin: ky tu co dau se ve bang font khac.
 * Chuoi nay phai cham vao ca latin, latin-ext lan vietnamese.
 */
const FONT_SAMPLE_TEXT = "Aa0 ăâđêôơư ảấầếệồổộớợủứựỳ";

const FONT_STACK = `${IMAGE_FONT_FAMILIES.map((name) => `"${name}"`).join(", ")}, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

type TextStyle = {
  font: string;
  color: string;
  lineHeight: number;
  gapBefore: number;
};

/**
 * Mau chu lay tu nen dang chon (xem summary-image-backgrounds.ts), con co chu va
 * khoang dong thi co dinh — doi nen khong duoc lam anh xe dich bo cuc.
 */
function buildStyles(palette: SummaryImagePalette) {
  return {
    title: { font: `700 27px ${FONT_STACK}`, color: palette.title, lineHeight: 34, gapBefore: 0 },
    subtitle: {
      font: `600 14px ${FONT_STACK}`,
      color: palette.subtitle,
      lineHeight: 22,
      gapBefore: 2,
    },
    heading: {
      font: `700 15px ${FONT_STACK}`,
      color: palette.heading,
      lineHeight: 24,
      gapBefore: 22,
    },
    body: { font: `400 15px ${FONT_STACK}`, color: palette.body, lineHeight: 23, gapBefore: 0 },
    qrTitle: { font: `700 18px ${FONT_STACK}`, color: palette.title, lineHeight: 26, gapBefore: 0 },
    qrAmount: {
      font: `700 22px ${FONT_STACK}`,
      color: palette.accent,
      lineHeight: 32,
      gapBefore: 0,
    },
    qrNote: { font: `600 15px ${FONT_STACK}`, color: palette.accent, lineHeight: 24, gapBefore: 0 },
    qrDetail: {
      font: `400 14px ${FONT_STACK}`,
      color: palette.muted,
      lineHeight: 21,
      gapBefore: 0,
    },
    footer: { font: `400 13px ${FONT_STACK}`, color: palette.muted, lineHeight: 20, gapBefore: 24 },
    /** Dong nhom trong phan chuyen tien cua ban chi tiet, vi du "Chuyen vao X". */
    groupLabel: {
      font: `600 14px ${FONT_STACK}`,
      color: palette.muted,
      lineHeight: 24,
      gapBefore: 6,
    },
  } satisfies Record<string, TextStyle>;
}

type Styles = ReturnType<typeof buildStyles>;

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

/**
 * Avatar sinh tu ten (xem Avatar.tsx — cung seed nen ra dung avatar da thay
 * trong app), khong phai anh tai qua mang nen khong can crossOrigin thuc su.
 */
async function loadAvatarImage(name: string) {
  const seed = normalizeContactName(name) || "?";
  const dataUri = createAvatar(funEmoji, { seed, size: AVATAR_SIZE * PIXEL_SCALE }).toDataUri();
  return loadImage(dataUri);
}

async function loadAvatarsByParticipantId(participants: ApiParticipant[]) {
  const loaded = await Promise.all(
    participants.map(async (participant) => {
      const image = await loadAvatarImage(participant.name);
      return image ? ([participant.id, image] as const) : null;
    }),
  );
  return new Map(loaded.filter((entry): entry is [string, HTMLImageElement] => entry !== null));
}

function drawAvatar(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number) {
  context.save();
  context.beginPath();
  context.arc(x + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(image, x, y, AVATAR_SIZE, AVATAR_SIZE);
  context.restore();
}

function buildAccountLines(payee: ApiParticipant, styles: Styles): QrLine[] {
  const detail = [getVietQrBankLabel(payee.bankId), payee.accountNo].filter(Boolean).join(" · ");
  return [
    [detail, styles.qrDetail],
    [payee.accountName || payee.name, styles.qrDetail],
  ];
}

/**
 * Tai truoc QR cho phan chuyen tien. Nguoi nhan chua nhap tai khoan hoac anh
 * tai loi thi bo qua, phan do van hien lai bang dong chu nhu cu.
 */
async function loadQrCards(
  input: SummaryTextInput,
  doc: SummaryDocument,
  styles: Styles,
): Promise<QrCards> {
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
                [`Chuyển cho ${host.name}`, styles.qrTitle],
                ["Quét rồi tự nhập số tiền", styles.qrNote],
                ...buildAccountLines(host, styles),
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
            [`${from.name} → ${to.name}`, styles.qrTitle],
            [`${formatThousands(settlement.amount)}k`, styles.qrAmount],
            ...buildAccountLines(to, styles),
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
  options: { divider?: string; avatar?: HTMLImageElement | null } = {},
): Block[] {
  const avatarOffset = options.avatar ? AVATAR_SIZE + AVATAR_TEXT_GAP : 0;
  const maxWidth = CARD_WIDTH - PADDING * 2 - avatarOffset;

  return wrapText(context, text, style, maxWidth).map((part, index) => {
    const gapBefore = index === 0 ? style.gapBefore : 0;
    const x = PADDING + avatarOffset + (index === 0 ? 0 : WRAP_INDENT);

    return {
      height: style.lineHeight,
      gapBefore,
      draw(target, y) {
        if (options.divider && index === 0 && gapBefore > 0) {
          target.fillStyle = options.divider;
          target.fillRect(PADDING, y - gapBefore / 2, CARD_WIDTH - PADDING * 2, 1);
        }
        if (options.avatar && index === 0) {
          drawAvatar(target, options.avatar, PADDING, y + (style.lineHeight - AVATAR_SIZE) / 2);
        }
        drawText(target, part, style, x, y);
      },
    };
  });
}

function buildQrBlock(card: QrCard, palette: SummaryImagePalette): Block {
  const textX = PADDING + QR_SIZE + QR_TEXT_GAP;
  const textHeight = card.lines.reduce((total, [, style]) => total + style.lineHeight, 0);

  return {
    height: QR_SIZE,
    gapBefore: QR_BLOCK_GAP,
    draw(context, y) {
      // Nen toi: lot mot mieng trang rong hon QR de no thanh co y chu khong
      // giong mot o trang bi bo quen giua nen.
      if (palette.qrMat) {
        context.fillStyle = palette.qrMat;
        context.fillRect(
          PADDING - QR_MAT_PADDING,
          y - QR_MAT_PADDING,
          QR_SIZE + QR_MAT_PADDING * 2,
          QR_SIZE + QR_MAT_PADDING * 2,
        );
      }

      context.strokeStyle = palette.qrFrame;
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
  styles: Styles,
  palette: SummaryImagePalette,
  participants: ApiParticipant[],
  avatarsByParticipantId: Map<string, HTMLImageElement>,
): Block[] {
  const blocks: Block[] = [
    ...buildTextBlocks(context, doc.title, styles.title),
    ...buildTextBlocks(context, doc.subtitle, styles.subtitle),
  ];

  for (const section of doc.sections) {
    blocks.push(
      ...buildTextBlocks(context, section.heading, styles.heading, {
        divider: palette.divider,
      }),
    );

    if (section.id === "settlements" && qrCards.host) {
      blocks.push(buildQrBlock(qrCards.host, palette));
    }

    section.lines.forEach((line, index) => {
      const card = section.id === "settlements" ? qrCards.byLineIndex.get(index) : undefined;
      if (card) {
        blocks.push(buildQrBlock(card, palette));
        return;
      }

      // Ban chi tiet chen dong nhom ("Chuyen vao X — tong ...:") giua cac dong
      // chuyen tien; khong danh dau thi no lan vao nhu mot luot chuyen nua.
      const isGroupLabel = section.id === "settlements" && !line.startsWith("- ");
      // Dong "TỪNG NGƯỜI" xep dung thu tu participants (xem buildPersonLines),
      // nen zip theo index la lay dung nguoi cho dong do.
      const avatar =
        section.id === "people"
          ? avatarsByParticipantId.get(participants[index]?.id || "")
          : section.id === "settlements"
            ? avatarsByParticipantId.get(section.lineParticipantIds?.[index] || "")
            : undefined;
      blocks.push(
        ...buildTextBlocks(context, line, isGroupLabel ? styles.groupLabel : styles.body, {
          avatar,
        }),
      );
    });
  }

  if (doc.footer) blocks.push(...buildTextBlocks(context, doc.footer, styles.footer));

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
    FONT_WEIGHTS.map((weight) => fonts.load(`${weight} 16px "${name}"`, FONT_SAMPLE_TEXT)),
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
  /** Id nen (xem SUMMARY_IMAGE_BACKGROUNDS); id la khong ro thi ve nen mac dinh. */
  backgroundId?: string,
  /** false thi bo qua tai va ve QR, chi con chu — dung khi chia se noi khong muon lo tai khoan qua QR. */
  showQr = true,
  /** false thi bo qua avatar truoc ten tung nguoi. */
  showAvatar = true,
): Promise<Blob> {
  const background = getSummaryImageBackground(backgroundId);
  const styles = buildStyles(background.palette);

  const doc = buildSummaryDocument(input, variant);
  // Font phai san sang truoc khi do chu, khong thi wrapText do bang font sai.
  const [, qrCards, avatarsByParticipantId] = await Promise.all([
    ensureImageFontsReady(),
    showQr
      ? loadQrCards(input, doc, styles)
      : Promise.resolve<QrCards>({ byLineIndex: new Map(), host: null }),
    showAvatar
      ? loadAvatarsByParticipantId(input.participants)
      : Promise.resolve(new Map<string, HTMLImageElement>()),
  ]);

  const measure = createContext(1, 1);
  const blocks = buildBlocks(
    doc,
    measure.context,
    qrCards,
    styles,
    background.palette,
    input.participants,
    avatarsByParticipantId,
  );

  const contentHeight = blocks.reduce((total, block) => total + block.gapBefore + block.height, 0);
  const cardHeight = ACCENT_BAR_HEIGHT + PADDING * 2 + contentHeight;

  const { canvas, context } = createContext(CARD_WIDTH, cardHeight);

  background.paint(context, CARD_WIDTH, cardHeight);
  context.fillStyle = background.palette.accent;
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
