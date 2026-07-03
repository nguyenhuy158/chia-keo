import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Equal,
  FileDown,
  Landmark,
  Link,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  ReceiptText,
  RotateCcw,
  Save,
  Sparkles,
  Settings,
  Tags,
  Trash2,
  Upload,
  UserRoundCheck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import {
  buildAvatarDataUri,
  createAvatarSeed,
  getAvatarSuggestionSeeds,
} from "./adapters/browser/avatar";
import {
  createRemoteGame,
  createShareSnapshot,
  fetchCurrentSession,
  fetchShareSnapshot,
  loginRemoteUser,
  logoutRemoteUser,
  registerRemoteUser,
  resetRemotePassword,
  saveRemoteExpenseTemplates,
  saveShareSnapshot,
  saveRemoteGame,
  scanReceiptWithAi,
  suggestExpenseWithAi,
  updateRemoteProfile,
} from "./adapters/browser/remote-api";
import {
  VIETQR_BANK_OPTIONS,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
} from "./adapters/browser/vietqr";
import { decodeShareGame } from "./core/application/share-game";
import { createGameReportText } from "./core/application/report";
import type { AiExpenseDraft } from "./core/application/ai-expense";
import {
  EXPENSE_CATEGORIES,
  getExpenseCategoryLabel,
  normalizeExpenseCategoryId,
} from "./core/domain/expense-categories";
import { formatMoney, formatMoneyInput, parseMoney } from "./core/domain/money";
import { toParticipantTitleCase } from "./core/domain/participant-name";
import { calculateBalances, calculateReceiptTotals, getRemainingPayable } from "./core/domain/split";
import { calculateGameStatistics } from "./core/domain/statistics";
import type {
  Expense,
  ExpenseCategoryId,
  ExpenseTemplate,
  Game,
  Participant,
  PaymentProfile,
  Receipt,
  SharePermission,
} from "./core/domain/types";
import {
  AMOUNT_PLACEHOLDER_VALUE,
  CREATE_REMOTE_GAME_TOAST_ID,
  DAYS_PER_MONTH,
  DATETIME_LOCAL_INPUT_LENGTH,
  DEFAULT_TOAST_DURATION_MS,
  DEFAULT_WORKSPACE_TAB,
  EXPENSE_PANEL_PAGE_SIZE,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_SUGGESTIONS,
  GOOGLE_AUTH_URL,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MINUTE,
  MOBILE_VISIBLE_EXPENSE_LIMIT,
  MOBILE_VISIBLE_PARTICIPANT_LIMIT,
  MOBILE_VISIBLE_SUGGESTION_LIMIT,
  PAYMENT_PROFILE_SAVE_TOAST_ID,
  REMOTE_SAVE_ERROR_TOAST_ID,
  REMOTE_SYNC_TOAST_ID,
  SAVE_TOAST_DELAY_MS,
  SHARE_LINK_TOAST_ID,
  WORKSPACE_TABS,
  emptyExpenseForm,
  emptyParticipantForm,
  emptyPaymentProfile,
  type ExpenseForm,
  type ExpenseSuggestion,
  type ParticipantForm,
  type WorkspaceTabId,
} from "./app-constants";
import { APP_TEXT } from "./app-messages";

type ExpenseCategorySummary = {
  categoryId: ExpenseCategoryId;
  label: string;
  total: number;
  count: number;
};

type ShareInfoTabId = "overview" | "expenses" | "balances" | "transfers";
type SharedEditableTabId = "entry" | ShareInfoTabId;

type SharedTabConfig<TTabId extends string> = {
  id: TTabId;
  label: string;
  icon: LucideIcon;
};

const SHARED_INFO_TABS: SharedTabConfig<ShareInfoTabId>[] = [
  { id: "overview", label: APP_TEXT.shareTabs.overview, icon: Sparkles },
  { id: "expenses", label: APP_TEXT.shareTabs.expenses, icon: ReceiptText },
  { id: "balances", label: APP_TEXT.shareTabs.balances, icon: Equal },
  { id: "transfers", label: APP_TEXT.shareTabs.transfers, icon: QrCode },
];

const SHARED_EDITABLE_TABS: SharedTabConfig<SharedEditableTabId>[] = [
  { id: "entry", label: APP_TEXT.shareTabs.entry, icon: Banknote },
  ...SHARED_INFO_TABS,
];

type SelectOption = {
  value: string;
  label: string;
};

type AuthMode = "login" | "register";

type GameUpdateOptions = {
  onSaved?: () => void;
  historyLabel?: string;
  skipHistory?: boolean;
};

type GameHistoryEntry = {
  id: string;
  gameId: string;
  label: string;
  createdAt: string;
  previousGame: Game;
};

type ParticipantReportExpense = {
  expense: Expense;
  paidByName: string;
  shareAmount: number;
  paidByParticipant: boolean;
};

type ParticipantReportData = {
  game: Game;
  participant: Participant;
  totalExpense: number;
  paid: number;
  owed: number;
  balance: number;
  collected: number;
  remainingPayable: number;
  relatedExpenses: ParticipantReportExpense[];
};

const MAX_GAME_HISTORY_ENTRIES = 20;
const REPORT_FILE_EXTENSION = ".png";
const REPORT_IMAGE_MIME_TYPE = "image/png";
const REPORT_IMAGE_WIDTH = 1080;
const REPORT_IMAGE_TEXT_COLOR = "#1c1917";
const REPORT_IMAGE_MUTED_COLOR = "#78716c";
const REPORT_IMAGE_BACKGROUND = "#fbf5f8";
const REPORT_IMAGE_SURFACE = "#ffffff";
const REPORT_IMAGE_BORDER = "#e7e5e4";
const REPORT_IMAGE_EMERALD = "#047857";
const REPORT_IMAGE_BLUE = "#1d4ed8";
const REPORT_IMAGE_RED = "#dc2626";
const REPORT_IMAGE_STONE = "#f5f5f4";
const REPORT_IMAGE_MARGIN = 40;
const REPORT_IMAGE_CARD_RADIUS = 16;
const REPORT_IMAGE_CARD_PADDING = 28;
const REPORT_IMAGE_CARD_GAP = 18;
const REPORT_IMAGE_TEXT_FONT =
  '24px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_SMALL_FONT =
  '20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_LABEL_FONT =
  '700 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_TITLE_FONT =
  '700 44px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_SECTION_FONT =
  '700 28px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_VALUE_FONT =
  '700 32px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const REPORT_IMAGE_LINE_HEIGHT = 32;
const RECEIPT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const FIRST_PAGE_INDEX = 0;
const MINIMUM_PAGE_COUNT = 1;
const PAGE_STEP = 1;
const SHARE_TOKEN_LENGTH = 8;
const SHARE_TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const APP_MARK_SIZE_CLASSES = {
  sm: "size-10",
  md: "size-12",
  lg: "size-14",
} as const;
const APP_ICON_SRC = "/app-icon.png";

const SHARE_PERMISSION_OPTIONS: SelectOption[] = [
  { value: "view", label: APP_TEXT.share.permissionView },
  { value: "edit", label: APP_TEXT.share.permissionEdit },
];

function AppMark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof APP_MARK_SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${APP_MARK_SIZE_CLASSES[size]} ${className}`}
      role="img"
      aria-label={APP_TEXT.app.iconLabel}
    >
      <img className="h-full w-full rounded-xl object-cover shadow-sm" src={APP_ICON_SRC} alt="" aria-hidden="true" />
    </span>
  );
}

function showSuccessToast(message: string, description?: string) {
  toast.success(message, { description, duration: DEFAULT_TOAST_DURATION_MS });
}

function showInfoToast(message: string, description?: string) {
  toast.info(message, { description, duration: DEFAULT_TOAST_DURATION_MS });
}

function showErrorToast(message: string, description?: string) {
  toast.error(message, { description, duration: 2600 });
}

function createId(prefix: string) {
  const randomValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${randomValue}`;
}

function createGameCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createShareToken() {
  const values = new Uint32Array(SHARE_TOKEN_LENGTH);

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * SHARE_TOKEN_ALPHABET.length);
    }
  }

  return Array.from(values, (value) => SHARE_TOKEN_ALPHABET[value % SHARE_TOKEN_ALPHABET.length]).join("");
}

function shouldRefreshShareToken(shareToken: string) {
  return shareToken.length > SHARE_TOKEN_LENGTH;
}

function createGame(name: string): Game {
  return {
    id: createId("game"),
    code: createGameCode(),
    name,
    paymentProfile: { ...emptyPaymentProfile },
    participants: [],
    expenses: [],
    receipts: [],
    shareToken: createShareToken(),
    createdAt: new Date().toISOString(),
  };
}

function getGameAgeLabel(createdAt: string) {
  const createdTime = Date.parse(createdAt);
  if (Number.isNaN(createdTime)) return APP_TEXT.fallback.newGameAge;

  const elapsedDays = Math.max(0, Math.floor((Date.now() - createdTime) / MILLISECONDS_PER_DAY));
  if (elapsedDays === 0) return APP_TEXT.fallback.today;
  if (elapsedDays < DAYS_PER_MONTH) return APP_TEXT.fallback.dayAge(elapsedDays);

  return APP_TEXT.fallback.monthAge(Math.floor(elapsedDays / DAYS_PER_MONTH));
}

function toDateTimeLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Date(date.getTime() - date.getTimezoneOffset() * MILLISECONDS_PER_MINUTE)
    .toISOString()
    .slice(0, DATETIME_LOCAL_INPUT_LENGTH);
}

function createDateTimeLocalInputValue() {
  return toDateTimeLocalInputValue(new Date().toISOString());
}

function parseDateTimeLocalInputValue(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatExpenseDateTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return APP_TEXT.fallback.unknown;

  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function createNewExpenseForm(patch: Partial<ExpenseForm> = {}): ExpenseForm {
  return {
    ...emptyExpenseForm,
    createdAt: createDateTimeLocalInputValue(),
    ...patch,
  };
}

function sortExpensesByCreatedAt(expenses: Expense[]) {
  return [...expenses].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(MINIMUM_PAGE_COUNT, Math.ceil(totalItems / pageSize));
}

function clampPageIndex(pageIndex: number, pageCount: number) {
  return Math.min(Math.max(pageIndex, FIRST_PAGE_INDEX), pageCount - PAGE_STEP);
}

function useExpensePagination(expenseCount: number, pageSize: number, resetKey: string) {
  const [pageIndex, setPageIndex] = useState(FIRST_PAGE_INDEX);
  const previousExpenseCountRef = useRef(expenseCount);
  const previousResetKeyRef = useRef(resetKey);
  const pageCount = getPageCount(expenseCount, pageSize);
  const clampedPageIndex = clampPageIndex(pageIndex, pageCount);
  const pageStart = clampedPageIndex * pageSize;

  useEffect(() => {
    setPageIndex((current) => clampPageIndex(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    const shouldResetPage =
      previousResetKeyRef.current !== resetKey || expenseCount > previousExpenseCountRef.current;

    if (shouldResetPage) {
      setPageIndex(FIRST_PAGE_INDEX);
    }

    previousExpenseCountRef.current = expenseCount;
    previousResetKeyRef.current = resetKey;
  }, [expenseCount, resetKey]);

  return {
    pageIndex: clampedPageIndex,
    pageCount,
    pageStart,
    pageEnd: pageStart + pageSize,
    shouldPaginate: pageCount > MINIMUM_PAGE_COUNT,
    canGoPrevious: clampedPageIndex > FIRST_PAGE_INDEX,
    canGoNext: clampedPageIndex < pageCount - PAGE_STEP,
    goToPreviousPage: () => setPageIndex((current) => clampPageIndex(current - PAGE_STEP, pageCount)),
    goToNextPage: () => setPageIndex((current) => clampPageIndex(current + PAGE_STEP, pageCount)),
  };
}

function summarizeExpenseCategories(expenses: Expense[]): ExpenseCategorySummary[] {
  const summaries = new Map<ExpenseCategoryId, ExpenseCategorySummary>();

  for (const expense of expenses) {
    const categoryId = normalizeExpenseCategoryId(expense.categoryId);
    const current = summaries.get(categoryId) || {
      categoryId,
      label: getExpenseCategoryLabel(categoryId),
      total: 0,
      count: 0,
    };

    summaries.set(categoryId, {
      ...current,
      total: current.total + expense.amount,
      count: current.count + 1,
    });
  }

  return Array.from(summaries.values()).sort((a, b) => b.total - a.total);
}

function getParticipantName(game: Game | undefined, participantId: string) {
  return game?.participants.find((participant) => participant.id === participantId)?.name || APP_TEXT.fallback.unknown;
}

function createExpenseForm(expense: Expense): ExpenseForm {
  return {
    title: expense.title,
    amount: formatMoney(expense.amount),
    createdAt: toDateTimeLocalInputValue(expense.createdAt),
    categoryId: normalizeExpenseCategoryId(expense.categoryId),
    payerId: expense.payerId,
    splitParticipantIds: expense.splitParticipantIds,
  };
}

function getParticipantAvatarSeed(participant: Participant) {
  return participant.avatarSeed || createAvatarSeed(participant.name);
}

function getExpenseCategoryIcon(categoryId?: string) {
  return EXPENSE_CATEGORY_ICONS[normalizeExpenseCategoryId(categoryId)];
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findParticipantByName(participants: Participant[], name: string) {
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return null;

  return (
    participants.find((participant) => normalizeSearchText(participant.name) === normalizedName) ||
    participants.find((participant) => normalizeSearchText(participant.name).includes(normalizedName)) ||
    null
  );
}

function readFileAsBase64(file: File) {
  return new Promise<{ mimeType: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [, data = ""] = result.split(",");

      resolve({ mimeType: file.type, data });
    };
    reader.onerror = () => reject(new Error(APP_TEXT.error.fileReadFailed));
    reader.readAsDataURL(file);
  });
}

function createReportFileName(game: Game, participant?: Participant) {
  const slug = normalizeSearchText(game.name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const participantSlug = participant
    ? normalizeSearchText(participant.name)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    : "";

  return `${[slug || "chia-keo", participantSlug].filter(Boolean).join("-")}${REPORT_FILE_EXTENSION}`;
}

function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function wrapCanvasText(context: CanvasRenderingContext2D, line: string, maxWidth: number) {
  if (!line) return [""];

  const rows: string[] = [];
  let currentRow = "";

  for (const word of line.split(" ")) {
    const nextRow = currentRow ? `${currentRow} ${word}` : word;

    if (!currentRow || context.measureText(nextRow).width <= maxWidth) {
      currentRow = nextRow;
    } else {
      rows.push(currentRow);
      currentRow = word;
    }
  }

  return [...rows, currentRow];
}

function getParticipantExpenseShare(expense: Expense, participantId: string) {
  const participantIndex = expense.splitParticipantIds.indexOf(participantId);
  if (participantIndex === -1 || expense.splitParticipantIds.length === 0) return 0;

  const baseAmount = Math.floor(expense.amount / expense.splitParticipantIds.length);
  const remainder = expense.amount % expense.splitParticipantIds.length;

  return baseAmount + (participantIndex < remainder ? 1 : 0);
}

function createParticipantReportData(game: Game, participantId: string): ParticipantReportData | null {
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) return null;

  const balances = calculateBalances(game);
  const row = balances.find((item) => item.participant.id === participant.id);
  const receiptTotals = calculateReceiptTotals(game);
  const collected = receiptTotals.get(participant.id) || 0;

  return {
    game,
    participant,
    totalExpense: game.expenses.reduce((total, expense) => total + expense.amount, 0),
    paid: row?.paid || 0,
    owed: row?.owed || 0,
    balance: row?.balance || 0,
    collected,
    remainingPayable: getRemainingPayable(row?.balance || 0, collected),
    relatedExpenses: game.expenses
      .filter((expense) => expense.payerId === participant.id || expense.splitParticipantIds.includes(participant.id))
      .map((expense) => ({
        expense,
        paidByName: getParticipantName(game, expense.payerId),
        shareAmount: getParticipantExpenseShare(expense, participant.id),
        paidByParticipant: expense.payerId === participant.id,
      })),
  };
}

function resolveReportParticipantId(game: Game, participantId: string) {
  return game.participants.some((participant) => participant.id === participantId)
    ? participantId
    : game.participants[0]?.id || "";
}

function drawRoundedCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillStyle = REPORT_IMAGE_SURFACE,
) {
  context.save();
  context.shadowColor = "rgb(15 23 42 / 0.08)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 8;
  context.fillStyle = fillStyle;
  context.beginPath();
  context.roundRect(x, y, width, height, REPORT_IMAGE_CARD_RADIUS);
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = REPORT_IMAGE_BORDER;
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

function drawCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    font?: string;
    color?: string;
    maxWidth?: number;
    lineHeight?: number;
  } = {},
) {
  context.font = options.font || REPORT_IMAGE_TEXT_FONT;
  context.fillStyle = options.color || REPORT_IMAGE_TEXT_COLOR;
  context.textBaseline = "top";

  const rows = options.maxWidth ? wrapCanvasText(context, text, options.maxWidth) : [text];
  rows.forEach((row, index) => {
    context.fillText(row, x, y + index * (options.lineHeight || REPORT_IMAGE_LINE_HEIGHT));
  });

  return y + rows.length * (options.lineHeight || REPORT_IMAGE_LINE_HEIGHT);
}

function drawReportMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  color: string,
) {
  drawRoundedCard(context, x, y, width, 118);
  drawCanvasText(context, label.toUpperCase(), x + 22, y + 20, {
    font: REPORT_IMAGE_LABEL_FONT,
    color: REPORT_IMAGE_MUTED_COLOR,
    maxWidth: width - 44,
    lineHeight: 24,
  });
  drawCanvasText(context, value, x + 22, y + 58, {
    font: REPORT_IMAGE_VALUE_FONT,
    color,
    maxWidth: width - 44,
    lineHeight: 38,
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error(APP_TEXT.toast.reportDownloadFailed));
      }
    }, REPORT_IMAGE_MIME_TYPE);
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createReportImageBlob(game: Game, participantId: string) {
  const data = createParticipantReportData(game, participantId);
  if (!data) return Promise.reject(new Error(APP_TEXT.toast.reportParticipantRequired));

  const paymentProfile = { ...emptyPaymentProfile, ...data.game.paymentProfile };
  const shouldShowPayment = data.balance < 0 && data.remainingPayable > 0;
  const canShowPayment = shouldShowPayment && canBuildVietQr(paymentProfile);
  const qrImage = canShowPayment
    ? await loadCanvasImage(buildVietQrUrl(paymentProfile, data.remainingPayable, data.game.code)).catch(() => null)
    : null;
  const cardWidth = REPORT_IMAGE_WIDTH - REPORT_IMAGE_MARGIN * 2;
  const relatedExpenseHeight = data.relatedExpenses.length > 0 ? data.relatedExpenses.length * 104 + 82 : 140;
  const transferCardHeight = shouldShowPayment ? 240 : 168;
  const imageHeight =
    REPORT_IMAGE_MARGIN * 2 +
    162 +
    REPORT_IMAGE_CARD_GAP +
    118 +
    REPORT_IMAGE_CARD_GAP +
    176 +
    REPORT_IMAGE_CARD_GAP +
    relatedExpenseHeight +
    REPORT_IMAGE_CARD_GAP +
    transferCardHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");

  canvas.width = REPORT_IMAGE_WIDTH * pixelRatio;
  canvas.height = imageHeight * pixelRatio;

  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error(APP_TEXT.toast.reportDownloadFailed));

  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = REPORT_IMAGE_BACKGROUND;
  context.fillRect(0, 0, REPORT_IMAGE_WIDTH, imageHeight);

  let y = REPORT_IMAGE_MARGIN;
  drawRoundedCard(context, REPORT_IMAGE_MARGIN, y, cardWidth, 162);
  drawCanvasText(context, data.game.code, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 24, {
    font: REPORT_IMAGE_LABEL_FONT,
    color: REPORT_IMAGE_EMERALD,
    maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
  });
  drawCanvasText(context, data.game.name, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 56, {
    font: REPORT_IMAGE_TITLE_FONT,
    maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
    lineHeight: 50,
  });
  drawCanvasText(context, APP_TEXT.reportImage.forParticipant(data.participant.name), REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 116, {
    font: REPORT_IMAGE_TEXT_FONT,
    color: REPORT_IMAGE_MUTED_COLOR,
    maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
  });

  y += 162 + REPORT_IMAGE_CARD_GAP;
  const metricWidth = (cardWidth - REPORT_IMAGE_CARD_GAP * 2) / 3;
  drawReportMetric(
    context,
    REPORT_IMAGE_MARGIN,
    y,
    metricWidth,
    APP_TEXT.reportImage.paid,
    formatMoney(data.paid),
    REPORT_IMAGE_BLUE,
  );
  drawReportMetric(
    context,
    REPORT_IMAGE_MARGIN + metricWidth + REPORT_IMAGE_CARD_GAP,
    y,
    metricWidth,
    APP_TEXT.reportImage.owed,
    formatMoney(data.owed),
    REPORT_IMAGE_TEXT_COLOR,
  );
  drawReportMetric(
    context,
    REPORT_IMAGE_MARGIN + (metricWidth + REPORT_IMAGE_CARD_GAP) * 2,
    y,
    metricWidth,
    data.balance < 0 ? APP_TEXT.reportImage.remainingPayable : APP_TEXT.reportImage.receive,
    data.balance < 0 ? formatMoney(data.remainingPayable) : formatMoney(Math.max(0, data.balance)),
    data.balance < 0 ? REPORT_IMAGE_RED : REPORT_IMAGE_EMERALD,
  );

  y += 118 + REPORT_IMAGE_CARD_GAP;
  drawRoundedCard(context, REPORT_IMAGE_MARGIN, y, cardWidth, 176);
  drawCanvasText(context, APP_TEXT.summary.balanceTitle, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 24, {
    font: REPORT_IMAGE_SECTION_FONT,
  });
  const balanceStatus =
    data.balance > 0
      ? APP_TEXT.reportImage.receiveStatus(formatMoney(data.balance))
      : data.balance < 0
        ? APP_TEXT.reportImage.payStatus(formatMoney(data.remainingPayable))
        : APP_TEXT.reportImage.settledStatus;
  drawCanvasText(context, balanceStatus, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 66, {
    font: REPORT_IMAGE_VALUE_FONT,
    color: data.balance < 0 ? REPORT_IMAGE_RED : REPORT_IMAGE_EMERALD,
    maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
  });
  const collectedText = data.collected > 0 ? APP_TEXT.reportImage.collected(formatMoney(data.collected)) : "";
  drawCanvasText(
    context,
    collectedText || APP_TEXT.reportImage.balanceDetail(formatMoney(data.paid), formatMoney(data.owed)),
    REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING,
    y + 114,
    {
      font: REPORT_IMAGE_TEXT_FONT,
      color: REPORT_IMAGE_MUTED_COLOR,
      maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
    },
  );

  y += 176 + REPORT_IMAGE_CARD_GAP;
  drawRoundedCard(context, REPORT_IMAGE_MARGIN, y, cardWidth, relatedExpenseHeight);
  drawCanvasText(
    context,
    APP_TEXT.reportImage.expensesFor(data.participant.name),
    REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING,
    y + 24,
    { font: REPORT_IMAGE_SECTION_FONT },
  );
  let rowY = y + 70;
  if (data.relatedExpenses.length === 0) {
    drawCanvasText(context, APP_TEXT.reportImage.noRelatedExpense, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, rowY, {
      font: REPORT_IMAGE_TEXT_FONT,
      color: REPORT_IMAGE_MUTED_COLOR,
      maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
    });
  } else {
    data.relatedExpenses.forEach(({ expense, paidByName, shareAmount, paidByParticipant }) => {
      context.fillStyle = REPORT_IMAGE_STONE;
      context.beginPath();
      context.roundRect(REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, rowY, cardWidth - REPORT_IMAGE_CARD_PADDING * 2, 84, 10);
      context.fill();
      drawCanvasText(context, expense.title, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING + 18, rowY + 14, {
        font: REPORT_IMAGE_TEXT_FONT,
        maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2 - 240,
      });
      context.textAlign = "right";
      drawCanvasText(context, formatMoney(expense.amount), REPORT_IMAGE_MARGIN + cardWidth - REPORT_IMAGE_CARD_PADDING - 18, rowY + 14, {
        font: REPORT_IMAGE_TEXT_FONT,
        color: REPORT_IMAGE_TEXT_COLOR,
      });
      context.textAlign = "left";
      drawCanvasText(
        context,
        APP_TEXT.reportImage.expenseDetail(formatExpenseDateTime(expense.createdAt), paidByName, formatMoney(shareAmount)),
        REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING + 18,
        rowY + 48,
        {
          font: REPORT_IMAGE_SMALL_FONT,
          color: paidByParticipant ? REPORT_IMAGE_BLUE : REPORT_IMAGE_MUTED_COLOR,
          maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2 - 36,
          lineHeight: 26,
        },
      );
      rowY += 104;
    });
  }

  y += relatedExpenseHeight + REPORT_IMAGE_CARD_GAP;
  drawRoundedCard(context, REPORT_IMAGE_MARGIN, y, cardWidth, transferCardHeight);
  drawCanvasText(context, APP_TEXT.summary.transferTitle, REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 24, {
    font: REPORT_IMAGE_SECTION_FONT,
  });
  if (shouldShowPayment) {
    const textWidth = qrImage ? cardWidth - REPORT_IMAGE_CARD_PADDING * 2 - 218 : cardWidth - REPORT_IMAGE_CARD_PADDING * 2;

    drawCanvasText(context, APP_TEXT.reportImage.needPay(formatMoney(data.remainingPayable)), REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING, y + 68, {
      font: REPORT_IMAGE_VALUE_FONT,
      color: REPORT_IMAGE_RED,
      maxWidth: textWidth,
    });
    drawCanvasText(
      context,
      canShowPayment
        ? APP_TEXT.reportImage.paymentInfo(paymentProfile.bankId, paymentProfile.accountNo, paymentProfile.accountName)
        : getVietQrPaymentIssue(paymentProfile),
      REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING,
      y + 116,
      {
        font: REPORT_IMAGE_TEXT_FONT,
        color: REPORT_IMAGE_MUTED_COLOR,
        maxWidth: textWidth,
        lineHeight: REPORT_IMAGE_LINE_HEIGHT,
      },
    );
    if (qrImage) {
      context.drawImage(qrImage, REPORT_IMAGE_MARGIN + cardWidth - REPORT_IMAGE_CARD_PADDING - 172, y + 34, 172, 172);
    }
  } else {
    drawCanvasText(
      context,
      data.balance > 0 ? APP_TEXT.reportImage.youReceive(formatMoney(data.balance)) : APP_TEXT.reportImage.noTransfer,
      REPORT_IMAGE_MARGIN + REPORT_IMAGE_CARD_PADDING,
      y + 76,
      {
        font: REPORT_IMAGE_VALUE_FONT,
        color: REPORT_IMAGE_EMERALD,
        maxWidth: cardWidth - REPORT_IMAGE_CARD_PADDING * 2,
      },
    );
  }

  return canvasToBlob(canvas);
}

function ExpenseCategoryIcon({
  categoryId,
  size = 16,
  className,
}: {
  categoryId?: string;
  size?: number;
  className?: string;
}) {
  const Icon = getExpenseCategoryIcon(categoryId);

  return <Icon size={size} className={className} aria-hidden="true" />;
}

function App() {
  const { shareToken = "" } = useParams();
  const [searchParams] = useSearchParams();
  const isShareMode = Boolean(shareToken);
  const [games, setGames] = useState<Game[]>([]);
  const [session, setSession] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileNameDraft, setProfileNameDraft] = useState(profileDisplayName);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profilePasswordError, setProfilePasswordError] = useState("");
  const [dataError, setDataError] = useState("");
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(!isShareMode);
  const [newGameName, setNewGameName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [reportParticipantId, setReportParticipantId] = useState("");
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(emptyParticipantForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(() => createNewExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTabId>(DEFAULT_WORKSPACE_TAB);
  const [copiedShare, setCopiedShare] = useState(false);
  const [sharePermission, setSharePermission] = useState<SharePermission>("view");
  const [remoteSharedGame, setRemoteSharedGame] = useState<Game | null>(null);
  const [remoteSharePermission, setRemoteSharePermission] = useState<SharePermission>("view");
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [expenseTemplates, setExpenseTemplates] = useState<ExpenseTemplate[]>([]);
  const [aiExpenseText, setAiExpenseText] = useState("");
  const [isAiExpenseLoading, setIsAiExpenseLoading] = useState(false);
  const [isAiReceiptLoading, setIsAiReceiptLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const selectedGame =
    games.find((game) => game.id === selectedGameId) ||
    games.find((game) => game.shareToken === shareToken) ||
    games[0];
  const accountDisplayName = profileDisplayName || session;
  const selectedGameHistory = selectedGame
    ? gameHistory.filter((entry) => entry.gameId === selectedGame.id)
    : [];

  useEffect(() => {
    if (isShareMode) {
      setIsCheckingSession(false);
      return;
    }

    let ignore = false;
    setIsCheckingSession(true);
    setIsLoadingGames(true);
    setDataError("");

    fetchCurrentSession()
      .then((result) => {
        if (ignore) return;

        const displayName = result.session.displayName || "";
        setSession(result.session.username);
        setProfileDisplayName(displayName);
        setProfileNameDraft(displayName || result.session.username);
        setGames(result.games);
        setExpenseTemplates(result.expenseTemplates);
        setSelectedGameId((current) => current || result.games[0]?.id || "");
        toast.success(APP_TEXT.toast.syncGamesSuccess, {
          id: REMOTE_SYNC_TOAST_ID,
          description: APP_TEXT.toast.syncGamesDescription(result.games.length),
          duration: 1600,
        });
      })
      .catch(() => {
        if (ignore) return;

        setSession("");
        setProfileDisplayName("");
        setProfileNameDraft("");
        setGames([]);
        setExpenseTemplates([]);
        setSelectedGameId("");
      })
      .finally(() => {
        if (!ignore) {
          setIsCheckingSession(false);
          setIsLoadingGames(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isShareMode]);

  useEffect(() => {
    if (!isShareMode) return;

    const shareData = searchParams.get("data");
    const decodedGame = shareData ? decodeShareGame(shareData) : null;
    if (decodedGame) {
      setRemoteSharedGame(decodedGame);
      setRemoteSharePermission(searchParams.get("mode") === "edit" ? "edit" : "view");
      setIsLoadingShare(false);
      return;
    }

    let ignore = false;
    setIsLoadingShare(true);
    setRemoteSharePermission("view");
    fetchShareSnapshot(shareToken)
      .then((snapshot) => {
        if (!ignore) {
          setRemoteSharedGame(snapshot?.game || null);
          setRemoteSharePermission(snapshot?.permission === "edit" ? "edit" : "view");
          if (snapshot?.game) showSuccessToast(APP_TEXT.toast.shareLoaded);
        }
      })
      .catch(() => {
        if (!ignore) {
          setRemoteSharedGame(null);
          showErrorToast(APP_TEXT.toast.shareLoadFailed);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingShare(false);
      });

    return () => {
      ignore = true;
    };
  }, [isShareMode, searchParams, shareToken]);

  function persistGames(nextGames: Game[]) {
    setGames(nextGames);
  }

  async function persistRemoteGame(game: Game) {
    try {
      await saveRemoteGame(game);
      setDataError("");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : APP_TEXT.toast.remoteSaveFailed;

      setDataError(message);
      toast.error(message, { id: REMOTE_SAVE_ERROR_TOAST_ID, duration: 2600 });
      return false;
    }
  }

  function updateSelectedGame(updater: (game: Game) => Game, options?: GameUpdateOptions) {
    if (!selectedGame) return;

    const nextGame = updater(selectedGame);
    if (!options?.skipHistory && nextGame !== selectedGame) {
      setGameHistory((current) =>
        [
          {
            id: createId("history"),
            gameId: selectedGame.id,
            label: options?.historyLabel || APP_TEXT.toast.historyDefaultLabel,
            createdAt: new Date().toISOString(),
            previousGame: selectedGame,
          },
          ...current,
        ].slice(0, MAX_GAME_HISTORY_ENTRIES),
      );
    }
    persistGames(games.map((game) => (game.id === selectedGame.id ? nextGame : game)));
    void persistRemoteGame(nextGame).then((saved) => {
      if (saved) options?.onSaved?.();
    });
  }

  function handleUndoLastChange() {
    const historyEntry = selectedGameHistory[0];
    if (!historyEntry || !selectedGame) return;

    const nextGames = games.map((game) => (game.id === selectedGame.id ? historyEntry.previousGame : game));
    persistGames(nextGames);
    setGameHistory((current) => current.filter((entry) => entry.id !== historyEntry.id));
    setEditingExpenseId("");
    setExpenseForm(createNewExpenseForm());
    void persistRemoteGame(historyEntry.previousGame);
    showInfoToast(APP_TEXT.toast.undoApplied, historyEntry.label);
  }

  function applyAuthResult(
    result: {
      session: { username: string; displayName?: string };
      games: Game[];
      expenseTemplates: ExpenseTemplate[];
    },
    fallbackUsername: string,
  ) {
    const loggedInUsername = result.session.username || fallbackUsername;
    const displayName = result.session.displayName || "";

    setGames(result.games);
    setExpenseTemplates(result.expenseTemplates);
    setSession(loggedInUsername);
    setSelectedGameId(result.games[0]?.id || "");
    setProfileDisplayName(displayName);
    setProfileNameDraft(displayName || loggedInUsername);
    setAuthError("");
    setLoginPassword("");
    setAuthConfirmPassword("");
    showSuccessToast(APP_TEXT.toast.loginSuccess, APP_TEXT.toast.loginGreeting(displayName || loggedInUsername));
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = loginName.trim();
    const password = loginPassword;

    try {
      if (authMode === "register") {
        if (password !== authConfirmPassword) {
          setAuthError(APP_TEXT.toast.passwordConfirmMismatch);
          return;
        }

        applyAuthResult(await registerRemoteUser(username, password), username);
        return;
      }

      applyAuthResult(await loginRemoteUser(username, password), username);
    } catch (error) {
      const message = error instanceof Error ? error.message : APP_TEXT.toast.loginFailed;

      setAuthError(message);
      showErrorToast(message);
      return;
    }
  }

  function handleLogout() {
    void logoutRemoteUser().catch(() => undefined);
    setSession("");
    setGames([]);
    setExpenseTemplates([]);
    setSelectedGameId("");
    setProfileDisplayName("");
    setProfileNameDraft("");
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileConfirmPassword("");
    setProfilePasswordError("");
    setProfileSettingsOpen(false);
    showInfoToast(APP_TEXT.toast.loggedOut);
  }

  function handleOpenProfileSettings() {
    setProfileNameDraft(profileDisplayName || session);
    setProfilePasswordError("");
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileConfirmPassword("");
    setProfileSettingsOpen((current) => !current);
    showInfoToast(
      profileSettingsOpen ? APP_TEXT.toast.profileSettingsClosed : APP_TEXT.toast.profileSettingsOpened,
    );
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = profileNameDraft.trim() || session;

    try {
      const nextSession = await updateRemoteProfile(displayName);
      setProfileDisplayName(nextSession.displayName || displayName);
      setProfileNameDraft(nextSession.displayName || displayName);
      setProfileSettingsOpen(false);
      toast.success(APP_TEXT.toast.profileSaved, { duration: 1600 });
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : APP_TEXT.toast.remoteSaveFailed);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileNewPassword !== profileConfirmPassword) {
      setProfilePasswordError(APP_TEXT.toast.passwordConfirmMismatch);
      return;
    }

    try {
      await resetRemotePassword(profileCurrentPassword, profileNewPassword);
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
      setProfilePasswordError("");
      toast.success(APP_TEXT.toast.passwordReset, { duration: 1600 });
    } catch (error) {
      const message = error instanceof Error ? error.message : APP_TEXT.toast.remoteSaveFailed;

      setProfilePasswordError(message);
      showErrorToast(message);
    }
  }

  function handleGoogleLogin() {
    if (!GOOGLE_AUTH_URL) {
      const message = APP_TEXT.toast.googleNotConfigured;

      setAuthError(message);
      showErrorToast(message);
      return;
    }

    showInfoToast(APP_TEXT.toast.googleRedirect);
    window.location.assign(GOOGLE_AUTH_URL);
  }

  function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGameName.trim();
    if (!name) {
      showErrorToast(APP_TEXT.toast.gameNameRequired);
      return;
    }

    const game = createGame(name);
    persistGames([game, ...games]);
    setSelectedGameId(game.id);
    setNewGameName("");
    setExpenseForm(createNewExpenseForm());
    setEditingExpenseId("");
    setActiveWorkspaceTab(DEFAULT_WORKSPACE_TAB);
    showSuccessToast(APP_TEXT.toast.gameCreated, game.name);
    createRemoteGame(game)
      .then(() => {
        setDataError("");
        toast.success(APP_TEXT.toast.gameSynced, { id: CREATE_REMOTE_GAME_TOAST_ID, duration: 1600 });
      })
      .catch((error: Error) => {
        setDataError(error.message);
        toast.error(error.message, { id: CREATE_REMOTE_GAME_TOAST_ID, duration: 2600 });
      });
  }

  function handleSelectGame(gameId: string) {
    const nextGame = games.find((game) => game.id === gameId);

    setSelectedGameId(gameId);
    setCopiedShare(false);
    setEditingExpenseId("");
    setExpenseForm(createNewExpenseForm());
    if (nextGame) showInfoToast(APP_TEXT.toast.gameSelected, nextGame.name);
  }

  function handleAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = toParticipantTitleCase(participantForm.name);
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    if (!name) {
      showErrorToast(APP_TEXT.toast.participantNameRequired);
      return;
    }

    const participant: Participant = {
      id: createId("participant"),
      name,
      avatarSeed: participantForm.avatarSeed || createAvatarSeed(name),
    };

    updateSelectedGame((game) => ({
      ...game,
      participants: [...game.participants, participant],
    }));
    setParticipantForm(emptyParticipantForm);
    setExpenseForm((current) => ({
      ...current,
      payerId: current.payerId || participant.id,
      splitParticipantIds: [...current.splitParticipantIds, participant.id],
    }));
    showSuccessToast(APP_TEXT.toast.participantAdded, participant.name);
  }

  function handleRemoveParticipant(participantId: string) {
    const participantName =
      selectedGame?.participants.find((participant) => participant.id === participantId)?.name ||
      APP_TEXT.fallback.participant;

    updateSelectedGame((game) => ({
      ...game,
      participants: game.participants.filter((participant) => participant.id !== participantId),
      receipts: (game.receipts || []).filter((receipt) => receipt.participantId !== participantId),
      expenses: game.expenses
        .filter((expense) => expense.payerId !== participantId)
        .map((expense) => ({
          ...expense,
          splitParticipantIds: expense.splitParticipantIds.filter((id) => id !== participantId),
        })),
    }));
    setExpenseForm((current) => ({
      ...current,
      payerId: current.payerId === participantId ? "" : current.payerId,
      splitParticipantIds: current.splitParticipantIds.filter((id) => id !== participantId),
    }));
    showInfoToast(APP_TEXT.toast.participantRemoved, participantName);
  }

  function handleToggleSplit(participantId: string) {
    const participantName =
      selectedGame?.participants.find((participant) => participant.id === participantId)?.name ||
      APP_TEXT.fallback.person;
    const isSelected = expenseForm.splitParticipantIds.includes(participantId);

    showInfoToast(
      isSelected ? APP_TEXT.toast.splitRemoved : APP_TEXT.toast.splitAdded,
      participantName,
    );

    setExpenseForm((current) => {
      const currentlySelected = current.splitParticipantIds.includes(participantId);

      return {
        ...current,
        splitParticipantIds: currentlySelected
          ? current.splitParticipantIds.filter((id) => id !== participantId)
          : [...current.splitParticipantIds, participantId],
      };
    });
  }

  function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    const participantIds = new Set(selectedGame.participants.map((participant) => participant.id));
    const payerId = expenseForm.payerId || selectedGame.participants[0]?.id || "";
    const splitParticipantIds = expenseForm.splitParticipantIds.filter((id) => participantIds.has(id));
    const amount = parseMoney(expenseForm.amount);
    const categoryId = normalizeExpenseCategoryId(expenseForm.categoryId);
    const expenseCreatedAt = parseDateTimeLocalInputValue(expenseForm.createdAt);

    if (!payerId) {
      showErrorToast(APP_TEXT.toast.payerRequired);
      return;
    }

    if (amount <= 0) {
      showErrorToast(APP_TEXT.toast.amountRequired);
      return;
    }

    if (!expenseCreatedAt) {
      showErrorToast(APP_TEXT.toast.expenseTimeRequired);
      return;
    }

    if (splitParticipantIds.length === 0) {
      showErrorToast(APP_TEXT.toast.splitRequired);
      return;
    }

    const existingExpense = selectedGame.expenses.find((expense) => expense.id === editingExpenseId);
    const expense: Expense = {
      id: existingExpense?.id || createId("expense"),
      title: expenseForm.title.trim() || APP_TEXT.fallback.expense,
      amount,
      categoryId,
      payerId,
      splitParticipantIds,
      createdAt: expenseCreatedAt,
    };

    updateSelectedGame((game) => ({
      ...game,
      expenses: sortExpensesByCreatedAt(
        existingExpense
          ? game.expenses.map((item) => (item.id === existingExpense.id ? expense : item))
          : [expense, ...game.expenses],
      ),
    }));
    setExpenseForm(
      createNewExpenseForm({
        payerId,
        splitParticipantIds,
      }),
    );
    setEditingExpenseId("");
    showSuccessToast(
      existingExpense ? APP_TEXT.toast.expenseUpdated : APP_TEXT.toast.expenseAdded,
      `${expense.title} - ${formatMoney(expense.amount)}`,
    );
  }

  function handleEditExpense(expenseId: string) {
    const expense = selectedGame?.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      showErrorToast(APP_TEXT.toast.expenseMissing);
      return;
    }

    setEditingExpenseId(expense.id);
    setExpenseForm(createExpenseForm(expense));
    setActiveWorkspaceTab("expenses");
    showInfoToast(APP_TEXT.toast.expenseEditing, expense.title);
    window.setTimeout(() => {
      const expenseTitleInput = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-expense-title-input]"),
      ).find((input) => input.offsetParent !== null);

      expenseTitleInput?.focus();
    }, 0);
  }

  function handleCancelEditExpense() {
    setEditingExpenseId("");
    setExpenseForm(createNewExpenseForm());
    showInfoToast(APP_TEXT.toast.expenseEditCanceled);
  }

  function handleRemoveExpense(expenseId: string) {
    const expenseTitle =
      selectedGame?.expenses.find((expense) => expense.id === expenseId)?.title || APP_TEXT.fallback.expense;

    updateSelectedGame((game) => ({
      ...game,
      expenses: game.expenses.filter((expense) => expense.id !== expenseId),
    }));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId("");
      setExpenseForm(createNewExpenseForm());
    }
    showInfoToast(APP_TEXT.toast.expenseRemoved, expenseTitle);
  }

  function applyAiExpenseDraft(draft: AiExpenseDraft) {
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    const payer = findParticipantByName(selectedGame.participants, draft.payerName) || selectedGame.participants[0];
    const splitParticipantIds = Array.from(
      new Set(
        draft.splitNames
          .map((name) => findParticipantByName(selectedGame.participants, name)?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const fallbackSplitIds = selectedGame.participants.map((participant) => participant.id);

    setExpenseForm((current) => ({
      ...current,
      title: draft.title,
      amount: draft.amount > 0 ? formatMoney(draft.amount) : current.amount,
      categoryId: normalizeExpenseCategoryId(draft.categoryId),
      payerId: payer?.id || current.payerId,
      splitParticipantIds: splitParticipantIds.length > 0 ? splitParticipantIds : fallbackSplitIds,
      createdAt: current.createdAt || createDateTimeLocalInputValue(),
    }));
    setActiveWorkspaceTab("expenses");
    showSuccessToast(APP_TEXT.toast.aiExpenseFilled, `${draft.title} - ${formatMoney(draft.amount)}`);
  }

  async function handleSuggestExpenseWithAi() {
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    const text = aiExpenseText.trim();
    if (!text) {
      showErrorToast(APP_TEXT.toast.aiExpenseTextRequired);
      return;
    }

    setIsAiExpenseLoading(true);
    try {
      const draft = await suggestExpenseWithAi({
        text,
        participants: selectedGame.participants,
      });

      applyAiExpenseDraft(draft);
      setAiExpenseText("");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : APP_TEXT.toast.aiExpenseSuggestFailed);
    } finally {
      setIsAiExpenseLoading(false);
    }
  }

  async function handleScanReceiptWithAi(file: File) {
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    setIsAiReceiptLoading(true);
    try {
      const image = await readFileAsBase64(file);
      const draft = await scanReceiptWithAi({ image });

      applyAiExpenseDraft(draft);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : APP_TEXT.toast.aiReceiptScanFailed);
    } finally {
      setIsAiReceiptLoading(false);
    }
  }

  function persistExpenseTemplates(nextTemplates: ExpenseTemplate[]) {
    setExpenseTemplates(nextTemplates);
    void saveRemoteExpenseTemplates(nextTemplates)
      .then((savedTemplates) => setExpenseTemplates(savedTemplates))
      .catch((error) => {
        showErrorToast(error instanceof Error ? error.message : APP_TEXT.toast.remoteSaveFailed);
      });
  }

  function handleApplyExpenseTemplate(template: ExpenseTemplate) {
    if (!selectedGame) return;

    const participantIds = selectedGame.participants.map((participant) => participant.id);

    setExpenseForm((current) => ({
      ...current,
      title: template.title,
      amount: formatMoney(template.amount),
      categoryId: normalizeExpenseCategoryId(template.categoryId),
      payerId: current.payerId || selectedGame.participants[0]?.id || "",
      splitParticipantIds: current.splitParticipantIds.length > 0 ? current.splitParticipantIds : participantIds,
      createdAt: current.createdAt || createDateTimeLocalInputValue(),
    }));
    showInfoToast(APP_TEXT.toast.templateApplied, template.title);
  }

  function handleSaveExpenseTemplate() {
    const title = expenseForm.title.trim();
    const amount = parseMoney(expenseForm.amount);
    if (!title || amount <= 0) {
      showErrorToast(APP_TEXT.toast.templateRequired);
      return;
    }

    const template: ExpenseTemplate = {
      id: createId("template"),
      title,
      amount,
      categoryId: normalizeExpenseCategoryId(expenseForm.categoryId),
      createdAt: new Date().toISOString(),
    };

    persistExpenseTemplates([template, ...expenseTemplates].slice(0, 12));
    showSuccessToast(APP_TEXT.toast.templateSaved, template.title);
  }

  function handleRemoveExpenseTemplate(templateId: string) {
    persistExpenseTemplates(expenseTemplates.filter((template) => template.id !== templateId));
    showInfoToast(APP_TEXT.toast.templateRemoved);
  }

  async function handleCopyReport(game: Game) {
    try {
      await navigator.clipboard.writeText(createGameReportText(game));
      showSuccessToast(APP_TEXT.toast.reportCopied);
    } catch {
      showErrorToast(APP_TEXT.toast.reportCopyFailed);
    }
  }

  async function handleDownloadReport(game: Game, participantId: string) {
    const participant = game.participants.find((item) => item.id === participantId);
    if (!participant) {
      showErrorToast(APP_TEXT.toast.reportParticipantRequired);
      return;
    }

    try {
      const blob = await createReportImageBlob(game, participant.id);
      downloadBlobFile(createReportFileName(game, participant), blob);
      showSuccessToast(APP_TEXT.toast.reportDownloaded, participant.name);
    } catch {
      showErrorToast(APP_TEXT.toast.reportDownloadFailed);
    }
  }

  function handleAddReceipt(participantId: string, amount: number) {
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.gameRequired);
      return;
    }

    if (amount <= 0) {
      showErrorToast(APP_TEXT.toast.receiptNoPayable);
      return;
    }

    const balance = calculateBalances(selectedGame).find((row) => row.participant.id === participantId)?.balance || 0;
    const receiptTotals = calculateReceiptTotals(selectedGame);
    const collectedAmount = receiptTotals.get(participantId) || 0;
    const remainingAmount = getRemainingPayable(balance, collectedAmount);
    if (amount > remainingAmount) {
      showErrorToast(APP_TEXT.toast.receiptAmountExceeded);
      return;
    }

    const participantName = getParticipantName(selectedGame, participantId);
    const receipt: Receipt = {
      id: createId("receipt"),
      participantId,
      amount,
      createdAt: new Date().toISOString(),
    };

    updateSelectedGame(
      (game) => ({
        ...game,
        receipts: [receipt, ...(game.receipts || [])],
      }),
      {
        onSaved: () =>
          showSuccessToast(APP_TEXT.toast.receiptRecorded, `${participantName} - ${formatMoney(amount)}`),
      },
    );
  }

  function handleRemoveReceipt(receiptId: string) {
    if (!selectedGame) return;

    const receipt = (selectedGame.receipts || []).find((item) => item.id === receiptId);
    const participantName = receipt
      ? getParticipantName(selectedGame, receipt.participantId)
      : APP_TEXT.fallback.receipt;

    updateSelectedGame(
      (game) => ({
        ...game,
        receipts: (game.receipts || []).filter((item) => item.id !== receiptId),
      }),
      {
        onSaved: () => showInfoToast(APP_TEXT.toast.receiptRemoved, participantName),
      },
    );
  }

  async function handleCopyShareLink() {
    if (!selectedGame) {
      showErrorToast(APP_TEXT.toast.shareGameRequired);
      return;
    }

    toast.loading(APP_TEXT.toast.shareCreating, { id: SHARE_LINK_TOAST_ID });
    let shareUrl = "";
    const shareableGame = shouldRefreshShareToken(selectedGame.shareToken)
      ? { ...selectedGame, shareToken: createShareToken() }
      : selectedGame;

    try {
      const result = await createShareSnapshot(shareableGame, sharePermission);
      shareUrl = `${window.location.origin}${result.url}`;
      if (shareableGame !== selectedGame) {
        updateSelectedGame(() => shareableGame, { skipHistory: true });
      }
      setDataError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : APP_TEXT.toast.shareCreateFailed;
      setDataError(message);
      toast.error(message, { id: SHARE_LINK_TOAST_ID, duration: 2600 });
      return;
    }

    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedShare(true);
      toast.success(APP_TEXT.toast.shareCopied, {
        id: SHARE_LINK_TOAST_ID,
        description: selectedGame.name,
        duration: DEFAULT_TOAST_DURATION_MS,
      });
      window.setTimeout(() => setCopiedShare(false), 1600);
    } catch {
      toast.error(APP_TEXT.toast.shareCopyFailed, { id: SHARE_LINK_TOAST_ID, duration: 2600 });
    }
  }

  function handleOpenExpenseAction() {
    if (!editingExpenseId) {
      setExpenseForm((current) =>
        current.title.trim() || current.amount.trim()
          ? current
          : createNewExpenseForm({
              categoryId: current.categoryId,
              payerId: current.payerId,
              splitParticipantIds: current.splitParticipantIds,
            }),
      );
    }
    setActiveWorkspaceTab("expenses");
    showInfoToast(APP_TEXT.toast.expenseFormOpened);
    window.setTimeout(() => {
      const expenseTitleInput = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-expense-title-input]"),
      ).find((input) => input.offsetParent !== null);

      expenseTitleInput?.focus();
    }, 0);
  }

  if (isShareMode) {
    const sharedGame = remoteSharedGame || games.find((game) => game.shareToken === shareToken);

    return (
      <PageShell>
        {isLoadingShare ? (
          <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center px-3 py-4 sm:px-5 sm:py-5">
            <EmptyState title={APP_TEXT.share.loadingTitle} description={APP_TEXT.share.loadingDescription} />
          </main>
        ) : sharedGame ? (
          <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 px-2 py-2 sm:px-4 sm:py-3">
            {remoteSharePermission === "edit" ? (
              <SharedEditableGame initialGame={sharedGame} shareToken={shareToken} />
            ) : (
              <SharedReadOnlyGame
                game={sharedGame}
                onCopyReport={handleCopyReport}
                onDownloadReport={handleDownloadReport}
              />
            )}
          </main>
        ) : (
          <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center px-3 py-4 sm:px-5 sm:py-5">
            <EmptyState title={APP_TEXT.share.missingTitle} description={APP_TEXT.share.missingDescription} />
          </main>
        )}
      </PageShell>
    );
  }

  if (isCheckingSession) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center px-3 py-4 sm:px-5 sm:py-5">
          <EmptyState title={APP_TEXT.login.loadingTitle} description={APP_TEXT.login.loadingDescription} />
        </main>
      </PageShell>
    );
  }

  if (!session) {
    const isRegisterMode = authMode === "register";
    const authTitle = isRegisterMode ? APP_TEXT.login.registerTitle : APP_TEXT.login.title;
    const authDescription = isRegisterMode ? APP_TEXT.login.registerDescription : APP_TEXT.login.description;
    const submitLabel = isRegisterMode ? APP_TEXT.login.registerSubmit : APP_TEXT.login.submit;

    return (
      <PageShell>
        <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 items-center px-4 py-6 sm:px-5">
          <form
            onSubmit={handleAuthSubmit}
            className="w-full rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-6">
              <AppMark size="lg" />
              <h1 className="mt-2 text-2xl font-semibold text-stone-950">{authTitle}</h1>
              <p className="mt-2 text-sm text-stone-600">{authDescription}</p>
              <div className="mt-4 grid grid-cols-2 rounded-md border border-stone-200 bg-stone-50 p-1">
                {(["login", "register"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAuthMode(mode);
                      setAuthError("");
                      setLoginPassword("");
                      setAuthConfirmPassword("");
                    }}
                    className={`h-8 rounded text-xs font-semibold transition ${
                      authMode === mode ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"
                    }`}
                  >
                    {APP_TEXT.login.modeLabels[mode]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-medium text-stone-700" htmlFor="username">
              {APP_TEXT.login.usernameLabel}
            </label>
            <input
              id="username"
              value={loginName}
              onChange={(event) => {
                setLoginName(event.target.value);
                setAuthError("");
              }}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              autoComplete="username"
              placeholder={APP_TEXT.login.usernamePlaceholder}
            />
            <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="password">
              {APP_TEXT.login.passwordLabel}
            </label>
            <input
              id="password"
              value={loginPassword}
              onChange={(event) => {
                setLoginPassword(event.target.value);
                setAuthError("");
              }}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              type="password"
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
              placeholder={APP_TEXT.login.passwordPlaceholder}
            />
            {isRegisterMode && (
              <>
                <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="confirm-password">
                  {APP_TEXT.login.confirmPasswordLabel}
                </label>
                <input
                  id="confirm-password"
                  value={authConfirmPassword}
                  onChange={(event) => {
                    setAuthConfirmPassword(event.target.value);
                    setAuthError("");
                  }}
                  className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  type="password"
                  autoComplete="new-password"
                  placeholder={APP_TEXT.login.confirmPasswordPlaceholder}
                />
              </>
            )}
            {authError && <p className="mt-3 text-sm font-medium text-red-600">{authError}</p>}
            <button
              type="submit"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <WalletCards size={18} />
              {submitLabel}
            </button>
            <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-stone-400">
              <span className="h-px flex-1 bg-stone-200" />
              {APP_TEXT.login.separator}
              <span className="h-px flex-1 bg-stone-200" />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-base font-bold text-blue-600">
                G
              </span>
              {APP_TEXT.login.google}
            </button>
          </form>
        </section>
      </PageShell>
    );
  }

  function renderPeoplePane(game: Game) {
    return (
      <div className="space-y-3">
        <ParticipantPanel
          game={game}
          form={participantForm}
          onChange={setParticipantForm}
          onSubmit={handleAddParticipant}
          onRemove={handleRemoveParticipant}
        />
        <PaymentProfilePanel game={game} onUpdate={updateSelectedGame} />
      </div>
    );
  }

  function renderExpensePane(game: Game) {
    return (
      <ExpensePanel
        game={game}
        form={expenseForm}
        onChange={setExpenseForm}
        onToggleSplit={handleToggleSplit}
        onSubmit={handleAddExpense}
        onRemove={handleRemoveExpense}
        onEdit={handleEditExpense}
        onCancelEdit={handleCancelEditExpense}
        editingExpenseId={editingExpenseId}
        templates={expenseTemplates}
        aiText={aiExpenseText}
        isAiExpenseLoading={isAiExpenseLoading}
        isAiReceiptLoading={isAiReceiptLoading}
        onAiTextChange={setAiExpenseText}
        onSuggestWithAi={handleSuggestExpenseWithAi}
        onScanReceipt={handleScanReceiptWithAi}
        onApplyTemplate={handleApplyExpenseTemplate}
        onSaveTemplate={handleSaveExpenseTemplate}
        onRemoveTemplate={handleRemoveExpenseTemplate}
      />
    );
  }

  function renderExpenseListPane(game: Game) {
    return <MobileExpenseListPane game={game} onEdit={handleEditExpense} onRemove={handleRemoveExpense} />;
  }

  function renderSummaryPane(game: Game) {
    return (
      <GameDashboard
        game={game}
        reportParticipantId={reportParticipantId}
        onAddReceipt={handleAddReceipt}
        onRemoveReceipt={handleRemoveReceipt}
        onReportParticipantChange={setReportParticipantId}
        onCopyReport={handleCopyReport}
        onDownloadReport={handleDownloadReport}
      />
    );
  }

  function renderMobilePane(game: Game) {
    if (activeWorkspaceTab === "expenseList") {
      return renderExpenseListPane(game);
    }

    if (activeWorkspaceTab === "expenses") {
      return (
        <MobileExpensePane
          game={game}
          form={expenseForm}
          onChange={setExpenseForm}
          onToggleSplit={handleToggleSplit}
          onSubmit={handleAddExpense}
          onRemove={handleRemoveExpense}
          onEdit={handleEditExpense}
          onCancelEdit={handleCancelEditExpense}
          editingExpenseId={editingExpenseId}
          templates={expenseTemplates}
          aiText={aiExpenseText}
          isAiExpenseLoading={isAiExpenseLoading}
          isAiReceiptLoading={isAiReceiptLoading}
          onAiTextChange={setAiExpenseText}
          onSuggestWithAi={handleSuggestExpenseWithAi}
          onScanReceipt={handleScanReceiptWithAi}
          onApplyTemplate={handleApplyExpenseTemplate}
          onSaveTemplate={handleSaveExpenseTemplate}
          onRemoveTemplate={handleRemoveExpenseTemplate}
        />
      );
    }

    if (activeWorkspaceTab === "summary") {
      return (
        <MobileSummaryPane
          game={game}
          reportParticipantId={reportParticipantId}
          onAddReceipt={handleAddReceipt}
          onReportParticipantChange={setReportParticipantId}
          onDownloadReport={handleDownloadReport}
        />
      );
    }

    return (
      <MobilePeoplePane
        game={game}
        form={participantForm}
        onChange={setParticipantForm}
        onSubmit={handleAddParticipant}
        onRemove={handleRemoveParticipant}
        onUpdate={updateSelectedGame}
      />
    );
  }

  return (
    <PageShell>
      <header className="shrink-0 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AppMark />
            <div className="min-w-0">
              <h1 className="sr-only">{APP_TEXT.app.iconLabel}</h1>
              <p className="hidden truncate text-sm font-medium text-stone-600 sm:block">{APP_TEXT.app.subtitle}</p>
            </div>
          </div>
          <div className="relative flex min-w-0 items-center justify-end gap-2">
            <div className="hidden min-w-0 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 sm:flex">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <UserRoundCheck size={16} aria-hidden="true" />
              </span>
              <span className="max-w-36 truncate text-sm font-semibold leading-snug text-stone-800 sm:max-w-48">
                {accountDisplayName}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenProfileSettings}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:w-10"
              aria-label={APP_TEXT.aria.settings}
              aria-expanded={profileSettingsOpen}
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-stone-300 bg-white px-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:px-3"
              aria-label={APP_TEXT.aria.logout}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{APP_TEXT.aria.logout}</span>
            </button>
            {profileSettingsOpen && (
              <div className="absolute right-0 top-12 z-30 max-h-[calc(100dvh-4rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-stone-200 bg-white p-3 shadow-lg shadow-stone-200/70 sm:w-80">
                <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <UserRoundCheck size={17} aria-hidden="true" />
                  </span>
                  <p className="min-w-0 text-sm font-semibold text-stone-950">{APP_TEXT.aria.settings}</p>
                </div>
                <form onSubmit={handleSaveProfile}>
                  <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="profile-display-name">
                    {APP_TEXT.profile.displayNameLabel}
                  </label>
                  <input
                    id="profile-display-name"
                    value={profileNameDraft}
                    onChange={(event) => setProfileNameDraft(event.target.value)}
                    className="field w-full"
                    placeholder={APP_TEXT.profile.displayNamePlaceholder}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileSettingsOpen(false)}
                      className="inline-flex h-10 min-w-20 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                    >
                      {APP_TEXT.profile.cancel}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex h-10 min-w-20 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <Check size={15} />
                      {APP_TEXT.profile.save}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleChangePassword} className="mt-4 border-t border-stone-100 pt-4">
                  <p className="mb-3 text-sm font-semibold text-stone-950">{APP_TEXT.profile.passwordTitle}</p>
                  <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="profile-current-password">
                    {APP_TEXT.profile.currentPasswordLabel}
                  </label>
                  <input
                    id="profile-current-password"
                    value={profileCurrentPassword}
                    onChange={(event) => {
                      setProfileCurrentPassword(event.target.value);
                      setProfilePasswordError("");
                    }}
                    className="field w-full"
                    type="password"
                    autoComplete="current-password"
                    placeholder={APP_TEXT.profile.currentPasswordPlaceholder}
                  />
                  <label className="mb-2 mt-3 block text-sm font-medium text-stone-700" htmlFor="profile-new-password">
                    {APP_TEXT.profile.newPasswordLabel}
                  </label>
                  <input
                    id="profile-new-password"
                    value={profileNewPassword}
                    onChange={(event) => {
                      setProfileNewPassword(event.target.value);
                      setProfilePasswordError("");
                    }}
                    className="field w-full"
                    type="password"
                    autoComplete="new-password"
                    placeholder={APP_TEXT.profile.newPasswordPlaceholder}
                  />
                  <label className="mb-2 mt-3 block text-sm font-medium text-stone-700" htmlFor="profile-confirm-password">
                    {APP_TEXT.profile.confirmPasswordLabel}
                  </label>
                  <input
                    id="profile-confirm-password"
                    value={profileConfirmPassword}
                    onChange={(event) => {
                      setProfileConfirmPassword(event.target.value);
                      setProfilePasswordError("");
                    }}
                    className="field w-full"
                    type="password"
                    autoComplete="new-password"
                    placeholder={APP_TEXT.profile.confirmPasswordPlaceholder}
                  />
                  {profilePasswordError && (
                    <p className="mt-2 text-sm font-medium text-red-600">{profilePasswordError}</p>
                  )}
                  <button
                    type="submit"
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    <Save size={15} />
                    {APP_TEXT.profile.changePassword}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-rows-[minmax(0,1fr)] gap-2 overflow-hidden px-2 py-2 md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1 md:gap-3 md:px-4 md:py-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="app-scroll-pane hidden min-w-0 space-y-2 md:block md:space-y-3">
          <form onSubmit={handleCreateGame} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <label className="text-sm font-medium text-stone-700" htmlFor="game-name">
              {APP_TEXT.game.createLabel}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="game-name"
                value={newGameName}
                onChange={(event) => setNewGameName(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder={APP_TEXT.game.createPlaceholder}
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
                aria-label={APP_TEXT.aria.createGame}
              >
                <Plus size={18} />
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800">
              <ReceiptText size={17} />
              {APP_TEXT.game.listTitle}
            </div>
            {games.length > 0 ? (
              <div className="flex snap-x gap-2 overflow-x-auto pb-1 md:block md:max-h-[calc(100dvh-13rem)] md:space-y-2 md:overflow-y-auto md:overflow-x-hidden md:pb-0">
                {games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelectGame(game.id)}
                    className={`w-48 shrink-0 snap-start rounded-md border px-3 py-2.5 text-left transition md:w-full ${
                      selectedGame?.id === game.id
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-stone-950">{game.name}</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {APP_TEXT.game.gameSummary(game.participants.length, game.expenses.length)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-4 text-sm text-stone-500">{APP_TEXT.game.emptyList}</p>
            )}
          </section>
        </aside>

        <section className="min-h-0 min-w-0 overflow-hidden">
          {selectedGame ? (
            <div className="flex h-full min-h-0 flex-col gap-2 md:gap-3">
              <MobileGameControls
                game={selectedGame}
                games={games}
                newGameName={newGameName}
                copiedShare={copiedShare}
                sharePermission={sharePermission}
                dataError={dataError}
                isLoadingGames={isLoadingGames}
                canUndo={selectedGameHistory.length > 0}
                onNewGameNameChange={setNewGameName}
                onCreateGame={handleCreateGame}
                onSelectGame={handleSelectGame}
                onSharePermissionChange={(value) => setSharePermission(value as SharePermission)}
                onCopyShareLink={handleCopyShareLink}
                onUndoLastChange={handleUndoLastChange}
              />

              <div className="hidden shrink-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm md:flex">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-700">{selectedGame.code}</p>
                  <h2 className="truncate text-lg font-semibold leading-tight text-stone-950 sm:text-xl">
                    {selectedGame.name}
                  </h2>
                  {dataError && <p className="mt-1 text-sm font-medium text-red-600">{dataError}</p>}
                  {isLoadingGames && <p className="mt-1 text-sm text-stone-500">{APP_TEXT.game.syncLoading}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="w-36">
                    <AppSelect
                      value={sharePermission}
                      onValueChange={(value) => setSharePermission(value as SharePermission)}
                      options={SHARE_PERMISSION_OPTIONS}
                      placeholder={APP_TEXT.share.permissionPlaceholder}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUndoLastChange}
                    disabled={selectedGameHistory.length === 0}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    {APP_TEXT.toast.undoApplied}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                    aria-label={copiedShare ? APP_TEXT.aria.shareCopied : APP_TEXT.aria.shareCopy}
                  >
                    {copiedShare ? <Copy size={16} /> : <Link size={16} />}
                    <span className="hidden sm:inline">
                      {copiedShare ? APP_TEXT.aria.shareCopied : APP_TEXT.aria.shareCopy}
                    </span>
                    <span className="sm:hidden">
                      {copiedShare ? APP_TEXT.game.copyDoneShort : APP_TEXT.game.copyLinkShort}
                    </span>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="mobile-one-screen h-full md:hidden">{renderMobilePane(selectedGame)}</div>

                <div className="app-scroll-pane hidden h-full pr-1 md:block xl:hidden">
                  {activeWorkspaceTab === "people" && renderPeoplePane(selectedGame)}
                  {activeWorkspaceTab === "expenses" && renderExpensePane(selectedGame)}
                  {activeWorkspaceTab === "expenseList" && renderExpenseListPane(selectedGame)}
                  {activeWorkspaceTab === "summary" && renderSummaryPane(selectedGame)}
                </div>

                <div className="hidden h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-3 xl:grid">
                  <div className="app-scroll-pane space-y-3 pr-1">
                    {renderPeoplePane(selectedGame)}
                    {renderExpensePane(selectedGame)}
                  </div>
                  <div className="app-scroll-pane pr-1">{renderSummaryPane(selectedGame)}</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title={APP_TEXT.game.emptyStartTitle} description={APP_TEXT.game.emptyStartDescription}>
              <form onSubmit={handleCreateGame} className="mx-auto mt-4 flex w-full max-w-sm gap-2 md:hidden">
                <input
                  value={newGameName}
                  onChange={(event) => setNewGameName(event.target.value)}
                  className="field min-w-0 flex-1 text-left"
                  placeholder={APP_TEXT.game.mobileCreatePlaceholder}
                  aria-label={APP_TEXT.game.createLabel}
                />
                <button
                  type="submit"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
                  aria-label={APP_TEXT.aria.createGame}
                >
                  <Plus size={16} />
                </button>
              </form>
            </EmptyState>
          )}
        </section>
      </main>
      {selectedGame && (
        <WorkspaceBottomBar
          activeTab={activeWorkspaceTab}
          onChange={setActiveWorkspaceTab}
          onAction={handleOpenExpenseAction}
        />
      )}
    </PageShell>
  );
}

function SharedReadOnlyGame({
  game,
  onCopyReport,
  onDownloadReport,
}: {
  game: Game;
  onCopyReport: (game: Game) => void;
  onDownloadReport: (game: Game, participantId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ShareInfoTabId>("overview");
  const [reportParticipantId, setReportParticipantId] = useState("");
  const selectedReportParticipantId = resolveReportParticipantId(game, reportParticipantId);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <SharedGameHeader
        game={game}
        actions={
          <>
            <button
              type="button"
              onClick={() => onCopyReport(game)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Copy size={15} />
              <span className="hidden min-[420px]:inline">{APP_TEXT.summary.copyReport}</span>
            </button>
            <div className="w-36 min-[420px]:w-44">
              <AppSelect
                value={selectedReportParticipantId}
                onValueChange={setReportParticipantId}
                options={game.participants.map((participant) => ({
                  value: participant.id,
                  label: participant.name,
                }))}
                placeholder={APP_TEXT.summary.reportParticipantLabel}
                disabled={game.participants.length === 0}
              />
            </div>
            <button
              type="button"
              onClick={() => onDownloadReport(game, selectedReportParticipantId)}
              disabled={!selectedReportParticipantId}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <FileDown size={15} />
              <span className="hidden min-[420px]:inline">{APP_TEXT.summary.downloadReport}</span>
            </button>
          </>
        }
      />
      <SharedTabList tabs={SHARED_INFO_TABS} activeTab={activeTab} onChange={setActiveTab} />
      <div className="app-scroll-pane min-h-0 flex-1 pr-1">
        <SharedInfoTabPanel game={game} activeTab={activeTab} />
      </div>
    </div>
  );
}

function SharedGameHeader({
  game,
  badge,
  actions,
}: {
  game: Game;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="shrink-0 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h1 className="mt-1 truncate text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
            {game.name}
          </h1>
        </div>
        {(badge || actions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {badge}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

function SharedTabList<TTabId extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: readonly SharedTabConfig<TTabId>[];
  activeTab: TTabId;
  onChange: (tab: TTabId) => void;
}) {
  return (
    <nav
      className="shrink-0 overflow-x-auto rounded-lg border border-stone-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label={APP_TEXT.share.permissionPlaceholder}
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition sm:text-sm ${
                isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SharedInfoTabPanel({ game, activeTab }: { game: Game; activeTab: ShareInfoTabId }) {
  if (activeTab === "expenses") {
    return <SharedExpensesPanel game={game} />;
  }

  if (activeTab === "balances") {
    return <SharedBalancesPanel game={game} />;
  }

  if (activeTab === "transfers") {
    return <SharedTransfersPanel game={game} />;
  }

  return <SharedOverviewPanel game={game} />;
}

function SharedOverviewPanel({ game }: { game: Game }) {
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
  const statistics = calculateGameStatistics(game);

  return (
    <div className="space-y-3 pb-1">
      <PatternSummaryCard game={game} totalExpense={totalExpense} />
      <section className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3">
        <Metric label={APP_TEXT.summary.totalExpenseMetric} value={formatMoney(totalExpense)} icon={Banknote} />
        <Metric label={APP_TEXT.summary.peopleCountMetric} value={String(game.participants.length)} icon={Users} />
        <Metric label={APP_TEXT.summary.expenseCountMetric} value={String(game.expenses.length)} icon={ReceiptText} />
      </section>
      <StatisticsCard statistics={statistics} />
      <CategorySummaryCard summaries={categorySummaries} />
    </div>
  );
}

function SharedExpensesPanel({ game }: { game: Game }) {
  const expensePagination = useExpensePagination(game.expenses.length, EXPENSE_PANEL_PAGE_SIZE, game.id);
  const visibleExpenses = game.expenses.slice(expensePagination.pageStart, expensePagination.pageEnd);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <ReceiptText size={18} className="text-emerald-700" aria-hidden="true" />
          {APP_TEXT.expense.title}
        </h3>
        <span className="text-xs font-semibold text-stone-500">
          {APP_TEXT.game.expensesCount(game.expenses.length)}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {visibleExpenses.length > 0 ? (
          visibleExpenses.map((expense) => {
            const payer = game.participants.find((participant) => participant.id === expense.payerId);
            const categoryId = normalizeExpenseCategoryId(expense.categoryId);
            const categoryLabel = getExpenseCategoryLabel(categoryId);

            return (
              <div key={expense.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-950">
                        {expense.title}
                      </p>
                      <CategoryPill categoryId={categoryId} label={categoryLabel} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {APP_TEXT.expense.paidBySplit(
                        payer?.name || APP_TEXT.fallback.unknown,
                        expense.splitParticipantIds.length,
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                      <CalendarClock size={12} aria-hidden="true" />
                      {formatExpenseDateTime(expense.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-stone-950">
                    {formatMoney(expense.amount)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-stone-500">{APP_TEXT.summary.noExpenses}</p>
        )}
        {expensePagination.shouldPaginate && (
          <PaginationControls
            pageIndex={expensePagination.pageIndex}
            pageCount={expensePagination.pageCount}
            canGoPrevious={expensePagination.canGoPrevious}
            canGoNext={expensePagination.canGoNext}
            onPrevious={expensePagination.goToPreviousPage}
            onNext={expensePagination.goToNextPage}
            className="pt-1"
          />
        )}
      </div>
    </section>
  );
}

function SharedBalancesPanel({ game }: { game: Game }) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
        <Equal size={18} className="text-emerald-700" aria-hidden="true" />
        {APP_TEXT.summary.balanceTitle}
      </h3>
      <div className="mt-4 space-y-3">
        {balances.length > 0 ? (
          balances.map((row) => {
            const collected = receiptTotals.get(row.participant.id) || 0;
            const remaining = getRemainingPayable(row.balance, collected);
            const displayBalance = row.balance < 0 ? -remaining : row.balance;

            return (
              <div key={row.participant.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <p className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-950">
                    {row.participant.name}
                  </p>
                  <BalancePill value={displayBalance} />
                </div>
                <div className="mt-3 grid gap-1 text-xs text-stone-500 min-[420px]:grid-cols-2 min-[420px]:gap-2">
                  <span>{APP_TEXT.summary.paid(formatMoney(row.paid))}</span>
                  <span>{APP_TEXT.summary.owed(formatMoney(row.owed))}</span>
                  {collected > 0 && <span>{APP_TEXT.summary.collectedDetail(formatMoney(collected))}</span>}
                  {row.balance < 0 && <span>{APP_TEXT.summary.remainingPayable(formatMoney(remaining))}</span>}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-stone-500">{APP_TEXT.summary.noParticipants}</p>
        )}
      </div>
    </section>
  );
}

function SharedTransfersPanel({ game }: { game: Game }) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const receipts = game.receipts || [];
  const payers = balances
    .map((row) => {
      const collected = receiptTotals.get(row.participant.id) || 0;
      return {
        row,
        collected,
        remaining: getRemainingPayable(row.balance, collected),
      };
    })
    .filter((item) => item.remaining > 0);
  const hasOwnerQr = canBuildVietQr(paymentProfile);
  const ownerQrIssue = getVietQrPaymentIssue(paymentProfile);

  return (
    <div className="space-y-3 pb-1">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <QrCode size={18} className="text-emerald-700" aria-hidden="true" />
          {APP_TEXT.summary.transferTitle}
        </h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {payers.length > 0 ? (
            payers.map(({ row, collected, remaining }) => {
              const grossAmount = Math.abs(row.balance);

              return (
                <div key={`${row.participant.id}-${remaining}`} className="rounded-md border border-stone-200 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                      <ArrowUpRight size={15} className="text-red-600" aria-hidden="true" />
                      {APP_TEXT.summary.needsToPay(row.participant.name)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(remaining)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {collected > 0
                        ? APP_TEXT.summary.grossDebtWithCollected(formatMoney(grossAmount), formatMoney(collected))
                        : APP_TEXT.summary.grossDebt(formatMoney(grossAmount))}
                    </p>
                  </div>
                  {hasOwnerQr ? (
                    <img
                      className="mt-3 h-48 w-full rounded-md border border-stone-200 bg-white object-contain"
                      src={buildVietQrUrl(paymentProfile, remaining, game.code)}
                      alt={APP_TEXT.summary.qrAlt}
                    />
                  ) : (
                    <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-500">
                      {ownerQrIssue}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">
              {game.expenses.length > 0 ? APP_TEXT.summary.noTransfer : APP_TEXT.summary.addExpenseHint}
            </p>
          )}
        </div>
      </section>

      {receipts.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-stone-950">{APP_TEXT.summary.collectedTitle}</h4>
          <div className="mt-2 space-y-2">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-stone-950">
                    {getParticipantName(game, receipt.participantId)}
                  </p>
                  <p className="text-xs text-stone-500">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-700">
                  {formatMoney(receipt.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SharedEditableGame({ initialGame, shareToken }: { initialGame: Game; shareToken: string }) {
  const [game, setGame] = useState(initialGame);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(() =>
    createNewExpenseForm({
      payerId: initialGame.participants[0]?.id || "",
      splitParticipantIds: initialGame.participants.map((participant) => participant.id),
    }),
  );
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SharedEditableTabId>("entry");

  useEffect(() => {
    setGame(initialGame);
    setExpenseForm(
      createNewExpenseForm({
        payerId: initialGame.participants[0]?.id || "",
        splitParticipantIds: initialGame.participants.map((participant) => participant.id),
      }),
    );
    setEditingExpenseId("");
    setActiveTab("entry");
  }, [initialGame]);

  function persistSharedGame(nextGame: Game, onSaved?: () => void) {
    setGame(nextGame);
    setIsSaving(true);
    void saveShareSnapshot(shareToken, nextGame)
      .then((snapshot) => {
        if (snapshot?.game) setGame(snapshot.game);
        onSaved?.();
      })
      .catch((error) => {
        showErrorToast(error instanceof Error ? error.message : APP_TEXT.toast.shareSaveFailed);
      })
      .finally(() => setIsSaving(false));
  }

  function handleToggleSplit(participantId: string) {
    setExpenseForm((current) => {
      const selected = current.splitParticipantIds.includes(participantId);

      return {
        ...current,
        splitParticipantIds: selected
          ? current.splitParticipantIds.filter((id) => id !== participantId)
          : [...current.splitParticipantIds, participantId],
      };
    });
  }

  function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const participantIds = new Set(game.participants.map((participant) => participant.id));
    const payerId = expenseForm.payerId || game.participants[0]?.id || "";
    const splitParticipantIds = expenseForm.splitParticipantIds.filter((id) => participantIds.has(id));
    const amount = parseMoney(expenseForm.amount);
    const categoryId = normalizeExpenseCategoryId(expenseForm.categoryId);
    const expenseCreatedAt = parseDateTimeLocalInputValue(expenseForm.createdAt);
    if (!payerId) {
      showErrorToast(APP_TEXT.toast.payerRequired);
      return;
    }
    if (amount <= 0) {
      showErrorToast(APP_TEXT.toast.amountRequired);
      return;
    }
    if (!expenseCreatedAt) {
      showErrorToast(APP_TEXT.toast.expenseTimeRequired);
      return;
    }
    if (splitParticipantIds.length === 0) {
      showErrorToast(APP_TEXT.toast.splitRequired);
      return;
    }

    const existingExpense = game.expenses.find((expense) => expense.id === editingExpenseId);
    const expense: Expense = {
      id: existingExpense?.id || createId("expense"),
      title: expenseForm.title.trim() || APP_TEXT.fallback.expense,
      amount,
      categoryId,
      payerId,
      splitParticipantIds,
      createdAt: expenseCreatedAt,
    };
    const nextGame = {
      ...game,
      expenses: existingExpense
        ? game.expenses.map((item) => (item.id === existingExpense.id ? expense : item))
        : [expense, ...game.expenses],
    };

    persistSharedGame(nextGame, () =>
      showSuccessToast(
        existingExpense ? APP_TEXT.toast.expenseUpdated : APP_TEXT.toast.expenseAdded,
        `${expense.title} - ${formatMoney(expense.amount)}`,
      ),
    );
    setExpenseForm(createNewExpenseForm({ payerId, splitParticipantIds }));
    setEditingExpenseId("");
  }

  function handleEditExpense(expenseId: string) {
    const expense = game.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      showErrorToast(APP_TEXT.toast.expenseMissing);
      return;
    }

    setEditingExpenseId(expense.id);
    setExpenseForm(createExpenseForm(expense));
    setActiveTab("entry");
  }

  function handleCancelEditExpense() {
    setEditingExpenseId("");
    setExpenseForm(createNewExpenseForm());
  }

  function handleRemoveExpense(expenseId: string) {
    const expenseTitle = game.expenses.find((expense) => expense.id === expenseId)?.title || APP_TEXT.fallback.expense;
    const nextGame = {
      ...game,
      expenses: game.expenses.filter((expense) => expense.id !== expenseId),
    };

    persistSharedGame(nextGame, () => showInfoToast(APP_TEXT.toast.expenseRemoved, expenseTitle));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId("");
      setExpenseForm(createNewExpenseForm());
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <SharedGameHeader
        game={game}
        badge={
          <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">
            {isSaving ? APP_TEXT.share.saving : APP_TEXT.share.editableLink}
          </span>
        }
      />
      <SharedTabList tabs={SHARED_EDITABLE_TABS} activeTab={activeTab} onChange={setActiveTab} />
      <div className="app-scroll-pane min-h-0 flex-1 pr-1">
        {activeTab === "entry" ? (
          <ExpensePanel
            game={game}
            form={expenseForm}
            onChange={setExpenseForm}
            onToggleSplit={handleToggleSplit}
            onSubmit={handleAddExpense}
            onRemove={handleRemoveExpense}
            onEdit={handleEditExpense}
            onCancelEdit={handleCancelEditExpense}
            editingExpenseId={editingExpenseId}
            templates={[]}
            aiText=""
            isAiExpenseLoading={false}
            isAiReceiptLoading={false}
            onAiTextChange={() => undefined}
            onSuggestWithAi={() => undefined}
            onScanReceipt={() => undefined}
            onApplyTemplate={() => undefined}
            onSaveTemplate={() => undefined}
            onRemoveTemplate={() => undefined}
            showAdvancedTools={false}
          />
        ) : (
          <SharedInfoTabPanel game={game} activeTab={activeTab} />
        )}
      </div>
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex flex-col bg-stone-100 text-stone-950">
      <Toaster closeButton richColors position="top-right" />
      {children}
    </div>
  );
}

function WorkspaceBottomBar({
  activeTab,
  onChange,
  onAction,
}: {
  activeTab: WorkspaceTabId;
  onChange: (tab: WorkspaceTabId) => void;
  onAction: () => void;
}) {
  const navTabs = WORKSPACE_TABS.filter((tab) => tab.id !== "expenses");
  const isExpenseActive = activeTab === "expenses";
  const itemClassName =
    "inline-flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1.5 text-xs font-semibold transition";

  return (
    <nav className="workspace-bottom-bar shrink-0 border-t border-stone-200 bg-white px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-sm xl:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 items-end gap-1.5">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`${itemClassName} ${
                isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-50"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAction}
          className={`${itemClassName} ${
            isExpenseActive ? "bg-blue-50 text-blue-800" : "text-stone-600 hover:bg-stone-50"
          }`}
          aria-label={APP_TEXT.aria.addExpense}
          aria-current={isExpenseActive ? "page" : undefined}
        >
          <Plus size={17} aria-hidden="true" />
          <span className="truncate">{APP_TEXT.summary.expenseMetric}</span>
        </button>
      </div>
    </nav>
  );
}

function MobileGameControls({
  game,
  games,
  newGameName,
  copiedShare,
  sharePermission,
  dataError,
  isLoadingGames,
  canUndo,
  onNewGameNameChange,
  onCreateGame,
  onSelectGame,
  onSharePermissionChange,
  onCopyShareLink,
  onUndoLastChange,
}: {
  game: Game;
  games: Game[];
  newGameName: string;
  copiedShare: boolean;
  sharePermission: SharePermission;
  dataError: string;
  isLoadingGames: boolean;
  canUndo: boolean;
  onNewGameNameChange: (name: string) => void;
  onCreateGame: (event: FormEvent<HTMLFormElement>) => void;
  onSelectGame: (gameId: string) => void;
  onSharePermissionChange: (permission: string) => void;
  onCopyShareLink: () => void;
  onUndoLastChange: () => void;
}) {
  return (
    <section className="mobile-game-controls shrink-0 rounded-lg border border-stone-200 bg-white p-2 shadow-sm md:hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-700">{game.code}</p>
          <h2 className="truncate text-base font-semibold leading-tight text-stone-950">{game.name}</h2>
        </div>
        <button
          type="button"
          onClick={onCopyShareLink}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          aria-label={copiedShare ? APP_TEXT.aria.shareCopied : APP_TEXT.aria.shareCopy}
        >
          {copiedShare ? <Copy size={14} /> : <Link size={14} />}
          {copiedShare ? APP_TEXT.game.copyDoneShort : APP_TEXT.game.copyLinkShort}
        </button>
      </div>

      {(dataError || isLoadingGames) && (
        <p className={`mt-1 truncate text-xs font-medium ${dataError ? "text-red-600" : "text-stone-500"}`}>
          {dataError || APP_TEXT.game.syncLoading}
        </p>
      )}

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <AppSelect
          value={sharePermission}
          onValueChange={onSharePermissionChange}
          options={SHARE_PERMISSION_OPTIONS}
          placeholder={APP_TEXT.share.permissionPlaceholder}
        />
        <button
          type="button"
          onClick={onUndoLastChange}
          disabled={!canUndo}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={14} />
          {APP_TEXT.toast.undoApplied}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <AppSelect
          value={game.id}
          onValueChange={onSelectGame}
          options={games.map((item) => ({ value: item.id, label: item.name }))}
          placeholder={APP_TEXT.game.selectPlaceholder}
          disabled={games.length === 0}
        />
        <form onSubmit={onCreateGame} className="flex min-w-0 gap-1">
          <input
            value={newGameName}
            onChange={(event) => onNewGameNameChange(event.target.value)}
            className="field min-w-0 flex-1"
            placeholder={APP_TEXT.game.mobileCreatePlaceholder}
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
            aria-label={APP_TEXT.aria.createGame}
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}

function MobilePeoplePane({
  game,
  form,
  onChange,
  onSubmit,
  onRemove,
  onUpdate,
}: {
  game: Game;
  form: ParticipantForm;
  onChange: (form: ParticipantForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (participantId: string) => void;
  onUpdate: (updater: (game: Game) => Game, options?: GameUpdateOptions) => void;
}) {
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const selectedBankId = resolveVietQrBankId(paymentProfile.bankId);
  const visibleParticipants = game.participants.slice(0, MOBILE_VISIBLE_PARTICIPANT_LIMIT);
  const hiddenParticipantCount = Math.max(0, game.participants.length - visibleParticipants.length);

  function updatePaymentProfile(patch: Partial<PaymentProfile>) {
    onUpdate((current) => ({
      ...current,
      paymentProfile: {
        ...emptyPaymentProfile,
        ...current.paymentProfile,
        ...patch,
      },
    }));
  }

  return (
    <section className="mobile-panel">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
          <Users size={16} className="text-emerald-700" />
          {APP_TEXT.people.title}
        </h3>
        <span className="text-xs font-semibold text-stone-500">
          {APP_TEXT.game.participantsCount(game.participants.length)}
        </span>
      </div>

      <form onSubmit={onSubmit} className="grid shrink-0 grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
        <input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value, avatarSeed: "" })}
          className="field"
          placeholder={APP_TEXT.people.namePlaceholder}
        />
        <button
          type="submit"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
          aria-label={APP_TEXT.people.add}
        >
          <Plus size={16} />
        </button>
      </form>

      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        {visibleParticipants.map((participant) => (
          <div
            key={participant.id}
            className="flex min-w-0 items-center gap-1.5 rounded-md border border-stone-200 px-2 py-1.5"
          >
            <img
              className="h-7 w-7 shrink-0 rounded-full bg-stone-100"
              src={buildAvatarDataUri(getParticipantAvatarSeed(participant), APP_TEXT.people.avatarAlt(participant.name))}
              alt=""
            />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-950">{participant.name}</span>
            <button
              type="button"
              onClick={() => onRemove(participant.id)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
              aria-label={APP_TEXT.people.removeAria(participant.name)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {hiddenParticipantCount > 0 && (
          <ParticipantMorePopover
            count={hiddenParticipantCount}
            participants={game.participants}
            onRemove={onRemove}
          />
        )}
      </div>

      <div className="min-h-0 rounded-md border border-stone-200 bg-stone-50 p-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-950">
          <WalletCards size={15} className="text-emerald-700" />
          {APP_TEXT.payment.mobileTitle}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CompactField label={APP_TEXT.payment.bankLabel} icon={Landmark} className="col-span-2">
            <BankSearchSelect
              value={selectedBankId}
              onValueChange={(bankId) => updatePaymentProfile({ bankId })}
              options={VIETQR_BANK_OPTIONS}
              placeholder={APP_TEXT.payment.bankPlaceholder}
            />
          </CompactField>
          <CompactField label={APP_TEXT.payment.accountNoShortLabel} icon={CreditCard}>
            <input
              value={paymentProfile.accountNo}
              onChange={(event) => updatePaymentProfile({ accountNo: event.target.value })}
              className="field"
              placeholder={APP_TEXT.payment.accountNoPlaceholder}
            />
          </CompactField>
          <CompactField label={APP_TEXT.payment.accountNameShortLabel} icon={UserRoundCheck}>
            <input
              value={paymentProfile.accountName}
              onChange={(event) => updatePaymentProfile({ accountName: event.target.value })}
              className="field"
              placeholder={APP_TEXT.payment.accountNamePlaceholder}
            />
          </CompactField>
        </div>
      </div>
    </section>
  );
}

function MobileExpensePane({
  game,
  form,
  onChange,
  onToggleSplit,
  onSubmit,
  onRemove,
  onEdit,
  onCancelEdit,
  editingExpenseId,
  templates = [],
  aiText = "",
  isAiExpenseLoading = false,
  isAiReceiptLoading = false,
  onAiTextChange,
  onSuggestWithAi,
  onScanReceipt,
  onApplyTemplate,
  onSaveTemplate,
  onRemoveTemplate,
  showAdvancedTools = true,
}: {
  game: Game;
  form: ExpenseForm;
  onChange: (form: ExpenseForm) => void;
  onToggleSplit: (participantId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (expenseId: string) => void;
  onEdit: (expenseId: string) => void;
  onCancelEdit: () => void;
  editingExpenseId: string;
  templates?: ExpenseTemplate[];
  aiText?: string;
  isAiExpenseLoading?: boolean;
  isAiReceiptLoading?: boolean;
  onAiTextChange?: (value: string) => void;
  onSuggestWithAi?: () => void;
  onScanReceipt?: (file: File) => void;
  onApplyTemplate?: (template: ExpenseTemplate) => void;
  onSaveTemplate?: () => void;
  onRemoveTemplate?: (templateId: string) => void;
  showAdvancedTools?: boolean;
}) {
  const payerId = form.payerId || game.participants[0]?.id || "";
  const expensePagination = useExpensePagination(game.expenses.length, MOBILE_VISIBLE_EXPENSE_LIMIT, game.id);
  const visibleExpenses = game.expenses.slice(expensePagination.pageStart, expensePagination.pageEnd);
  const visibleSuggestions = EXPENSE_SUGGESTIONS.slice(0, MOBILE_VISIBLE_SUGGESTION_LIMIT);
  const isEditing = Boolean(editingExpenseId);

  function handleApplySuggestion(suggestion: ExpenseSuggestion) {
    const allParticipantIds = game.participants.map((participant) => participant.id);

    onChange({
      ...form,
      title: suggestion.title,
      amount: formatMoney(suggestion.amount),
      categoryId: suggestion.categoryId,
      payerId,
      splitParticipantIds: form.splitParticipantIds.length > 0 ? form.splitParticipantIds : allParticipantIds,
    });
    showInfoToast(APP_TEXT.toast.suggestionApplied, suggestion.title);
  }

  return (
    <section className="mobile-panel">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
          <Banknote size={16} className="text-blue-700" />
          {APP_TEXT.expense.title}
        </h3>
        <span className="text-xs font-semibold text-stone-500">
          {APP_TEXT.game.expensesCount(game.expenses.length)}
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {visibleSuggestions.map((suggestion) => {
          const Icon = getExpenseCategoryIcon(suggestion.categoryId);

          return (
            <button
              key={`${suggestion.categoryId}-${suggestion.title}`}
              type="button"
              onClick={() => handleApplySuggestion(suggestion)}
              disabled={game.participants.length === 0}
              className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md border border-stone-200 bg-white px-1.5 text-[0.7rem] font-semibold text-stone-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon size={13} className="shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="min-w-0 truncate">{suggestion.title}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="grid shrink-0 grid-cols-2 gap-2">
        <CompactField label={APP_TEXT.expense.contentLabel} icon={ReceiptText}>
          <input
            data-expense-title-input="true"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder={APP_TEXT.expense.contentPlaceholder}
          />
        </CompactField>
        <CompactField label={APP_TEXT.expense.amountLabel} icon={Banknote}>
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: formatMoneyInput(event.target.value) })}
            className="field"
            inputMode="numeric"
            placeholder={formatMoney(AMOUNT_PLACEHOLDER_VALUE)}
          />
        </CompactField>
        <CompactField label={APP_TEXT.expense.spentAtShortLabel} icon={CalendarClock}>
          <input
            value={form.createdAt}
            onChange={(event) => onChange({ ...form, createdAt: event.target.value })}
            className="field"
            type="datetime-local"
          />
        </CompactField>
        <CompactField label={APP_TEXT.expense.payerLabel} icon={WalletCards}>
          <AppSelect
            value={payerId}
            onValueChange={(value) => onChange({ ...form, payerId: value })}
            options={game.participants.map((participant) => ({
              value: participant.id,
              label: participant.name,
            }))}
            placeholder={APP_TEXT.expense.payerPlaceholder}
            disabled={game.participants.length === 0}
          />
        </CompactField>
        <CompactField label={APP_TEXT.expense.categoryLabel} icon={Tags} className="col-span-2">
          <div
            role="radiogroup"
            aria-label={APP_TEXT.expense.categoryLabel}
            className="grid grid-cols-6 gap-1 rounded-md border border-stone-200 bg-stone-50 p-1"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-label={category.label}
                aria-checked={form.categoryId === category.id}
                onClick={() => onChange({ ...form, categoryId: normalizeExpenseCategoryId(category.id) })}
                className={`inline-flex h-8 items-center justify-center rounded-md border transition ${
                  form.categoryId === category.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <ExpenseCategoryIcon categoryId={category.id} size={14} />
              </button>
            ))}
          </div>
        </CompactField>
        <div className="col-span-2">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-700">
            <Users size={13} aria-hidden="true" />
            {APP_TEXT.expense.splitLabel}
          </p>
          <div className="flex flex-wrap gap-1">
            {game.participants.map((participant) => {
              const checked = form.splitParticipantIds.includes(participant.id);
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => onToggleSplit(participant.id)}
                  className={`inline-flex h-8 max-w-24 items-center gap-1 rounded-md border px-2 text-xs font-medium transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {checked && <Check size={12} aria-hidden="true" />}
                  <span className="truncate">{participant.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={game.participants.length === 0}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isEditing ? <Check size={15} /> : <Plus size={15} />}
            {isEditing ? APP_TEXT.expense.updateShort : APP_TEXT.expense.addShort}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              {APP_TEXT.expense.cancel}
            </button>
          )}
        </div>
      </form>

      <div className="min-h-0 space-y-1.5">
        {visibleExpenses.map((expense) => {
          const payer = game.participants.find((participant) => participant.id === expense.payerId);
          const categoryId = normalizeExpenseCategoryId(expense.categoryId);

          return (
            <div key={expense.id} className="flex items-center gap-2 rounded-md border border-stone-200 px-2 py-1.5">
              <ExpenseCategoryIcon categoryId={categoryId} size={14} className="shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-stone-950">{expense.title}</p>
                <p className="truncate text-[0.68rem] text-stone-500">
                  {APP_TEXT.expense.paidBy(payer?.name || APP_TEXT.fallback.unknown)} -{" "}
                  {formatExpenseDateTime(expense.createdAt)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
              <button
                type="button"
                onClick={() => onEdit(expense.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50"
                aria-label={APP_TEXT.expense.editAria(expense.title)}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(expense.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                aria-label={APP_TEXT.expense.removeAria(expense.title)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {expensePagination.shouldPaginate && (
          <PaginationControls
            pageIndex={expensePagination.pageIndex}
            pageCount={expensePagination.pageCount}
            canGoPrevious={expensePagination.canGoPrevious}
            canGoNext={expensePagination.canGoNext}
            onPrevious={expensePagination.goToPreviousPage}
            onNext={expensePagination.goToNextPage}
            compact
            className="pt-1"
          />
        )}
      </div>
    </section>
  );
}

function MobileExpenseListPane({
  game,
  onEdit,
  onRemove,
}: {
  game: Game;
  onEdit: (expenseId: string) => void;
  onRemove: (expenseId: string) => void;
}) {
  const expensePagination = useExpensePagination(game.expenses.length, EXPENSE_PANEL_PAGE_SIZE, game.id);
  const visibleExpenses = game.expenses.slice(expensePagination.pageStart, expensePagination.pageEnd);

  return (
    <section className="mobile-panel">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
          <ReceiptText size={16} className="text-emerald-700" aria-hidden="true" />
          {APP_TEXT.expense.listTitle}
        </h3>
        <span className="text-xs font-semibold text-stone-500">
          {APP_TEXT.game.expensesCount(game.expenses.length)}
        </span>
      </div>

      <div className="app-scroll-pane min-h-0 flex-1 space-y-2 pr-1">
        {visibleExpenses.length > 0 ? (
          visibleExpenses.map((expense) => {
            const payer = game.participants.find((participant) => participant.id === expense.payerId);
            const categoryId = normalizeExpenseCategoryId(expense.categoryId);
            const categoryLabel = getExpenseCategoryLabel(categoryId);

            return (
              <div key={expense.id} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-950">
                        {expense.title}
                      </p>
                      <CategoryPill categoryId={categoryId} label={categoryLabel} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {APP_TEXT.expense.paidBySplit(
                        payer?.name || APP_TEXT.fallback.unknown,
                        expense.splitParticipantIds.length,
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                      <CalendarClock size={12} aria-hidden="true" />
                      {formatExpenseDateTime(expense.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-stone-950">
                    {formatMoney(expense.amount)}
                  </span>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50"
                    aria-label={APP_TEXT.expense.editAria(expense.title)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label={APP_TEXT.expense.removeAria(expense.title)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
            {APP_TEXT.summary.noExpenses}
          </div>
        )}
      </div>

      {expensePagination.shouldPaginate && (
        <PaginationControls
          pageIndex={expensePagination.pageIndex}
          pageCount={expensePagination.pageCount}
          canGoPrevious={expensePagination.canGoPrevious}
          canGoNext={expensePagination.canGoNext}
          onPrevious={expensePagination.goToPreviousPage}
          onNext={expensePagination.goToNextPage}
          compact
        />
      )}
    </section>
  );
}

function MobileSummaryPane({
  game,
  reportParticipantId,
  onAddReceipt,
  onReportParticipantChange,
  onDownloadReport,
}: {
  game: Game;
  reportParticipantId: string;
  onAddReceipt?: (participantId: string, amount: number) => void;
  onReportParticipantChange: (participantId: string) => void;
  onDownloadReport?: (game: Game, participantId: string) => void;
}) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
  const statistics = calculateGameStatistics(game);
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const payers = balances
    .map((row) => {
      const collected = receiptTotals.get(row.participant.id) || 0;
      return {
        row,
        collected,
        remaining: getRemainingPayable(row.balance, collected),
      };
    })
    .filter((item) => item.remaining > 0);
  const topCategory = categorySummaries[0];
  const hasOwnerQr = canBuildVietQr(paymentProfile);
  const ownerQrIssue = getVietQrPaymentIssue(paymentProfile);
  const selectedReportParticipantId = resolveReportParticipantId(game, reportParticipantId);

  return (
    <section className="mobile-panel">
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <MiniMetric label={APP_TEXT.summary.totalMetric} value={formatMoney(totalExpense)} icon={Banknote} />
        <MiniMetric label={APP_TEXT.summary.peopleMetric} value={String(game.participants.length)} icon={Users} />
        <MiniMetric label={APP_TEXT.summary.expenseMetric} value={String(game.expenses.length)} icon={ReceiptText} />
      </div>

      {onDownloadReport && (
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
          <AppSelect
            value={selectedReportParticipantId}
            onValueChange={onReportParticipantChange}
            options={game.participants.map((participant) => ({
              value: participant.id,
              label: participant.name,
            }))}
            placeholder={APP_TEXT.summary.reportParticipantLabel}
            disabled={game.participants.length === 0}
          />
          <button
            type="button"
            onClick={() => onDownloadReport(game, selectedReportParticipantId)}
            disabled={!selectedReportParticipantId}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={APP_TEXT.summary.downloadReport}
          >
            <FileDown size={15} />
          </button>
        </div>
      )}

      {topCategory && (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-stone-200 px-2 py-1.5">
          <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-stone-950">
            <ExpenseCategoryIcon categoryId={topCategory.categoryId} size={14} className="text-emerald-700" />
            <span className="truncate">{topCategory.label}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-stone-950">{formatMoney(topCategory.total)}</span>
        </div>
      )}

      <div className="min-h-0 max-h-36 space-y-1.5 overflow-y-auto pr-1">
        {balances.length > 0 ? (
          balances.map((row) => (
            <div
              key={row.participant.id}
              className="flex items-center justify-between gap-2 rounded-md border border-stone-200 px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-stone-950">{row.participant.name}</span>
              <BalancePill value={row.balance} />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-stone-200 px-2 py-2 text-xs text-stone-500">
            {APP_TEXT.summary.noParticipants}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 rounded-md border border-stone-200 bg-stone-50 p-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-950">
          <QrCode size={14} className="text-emerald-700" />
          {APP_TEXT.summary.qrTitle}
        </p>
        {payers.length > 0 ? (
          <div className="mt-2 grid max-h-full min-h-0 gap-2 overflow-y-auto pr-1">
            {payers.map(({ row, collected, remaining }) => (
              <div
                key={row.participant.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2 rounded-md bg-white p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{row.participant.name}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(remaining)}</p>
                  {collected > 0 && (
                    <p className="mt-1 text-[0.68rem] text-stone-500">
                      {APP_TEXT.summary.collected(formatMoney(collected))}
                    </p>
                  )}
                  {onAddReceipt && (
                    <ReceiptAmountForm
                      participantId={row.participant.id}
                      remainingAmount={remaining}
                      onAddReceipt={onAddReceipt}
                      compact
                    />
                  )}
                </div>
                {hasOwnerQr ? (
                  <img
                    className="h-[5.5rem] w-[5.5rem] rounded-md border border-stone-200 bg-white object-contain"
                    src={buildVietQrUrl(paymentProfile, remaining, game.code)}
                    alt={APP_TEXT.summary.qrAlt}
                  />
                ) : (
                  <p className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-md bg-stone-50 px-2 text-center text-[0.68rem] text-stone-500">
                    {ownerQrIssue}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-md bg-white px-2 py-2 text-xs text-stone-500">
            {APP_TEXT.summary.noTransfer}
          </p>
        )}
      </div>
    </section>
  );
}

function CompactField({
  label,
  icon: Icon,
  children,
  className = "",
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="compact-field-label mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-700">
        {Icon && <Icon size={13} aria-hidden="true" />}
        {label}
      </span>
      {children}
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[0.68rem] font-semibold uppercase text-stone-500">{label}</p>
        <Icon size={13} className="shrink-0 text-emerald-700" aria-hidden="true" />
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function ReceiptAmountForm({
  participantId,
  remainingAmount,
  onAddReceipt,
  compact = false,
}: {
  participantId: string;
  remainingAmount: number;
  onAddReceipt: (participantId: string, amount: number) => void;
  compact?: boolean;
}) {
  const [amount, setAmount] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoney(amount);
    if (parsedAmount <= 0) {
      showErrorToast(APP_TEXT.toast.amountRequired);
      return;
    }

    if (parsedAmount > remainingAmount) {
      showErrorToast(APP_TEXT.toast.receiptAmountExceeded);
      return;
    }

    onAddReceipt(participantId, parsedAmount);
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "mt-2 space-y-1" : "mt-3 space-y-2"}>
      {!compact && (
        <p className="text-xs font-semibold text-stone-700">{APP_TEXT.summary.collectAdvanceTitle}</p>
      )}
      <div className={compact ? "flex gap-1" : "flex flex-col gap-2 sm:flex-row"}>
        <input
          value={amount}
          onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
          className={compact ? "field h-8 min-w-0 flex-1 px-2 text-xs" : "field min-w-0 flex-1"}
          inputMode="numeric"
          placeholder={`${APP_TEXT.summary.collectAdvancePlaceholder} (${formatMoney(remainingAmount)})`}
          aria-label={APP_TEXT.summary.collectAdvancePlaceholder}
        />
        <button
          type="submit"
          className={
            compact
              ? "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-2 text-[0.68rem] font-semibold text-white transition hover:bg-emerald-800"
              : "inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          }
        >
          {APP_TEXT.summary.collectAdvanceSubmit}
        </button>
      </div>
    </form>
  );
}

function MorePill({ count }: { count: number }) {
  return (
    <span className="inline-flex h-7 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-2 text-xs font-semibold text-stone-500">
      +{count}
    </span>
  );
}

function PaginationControls({
  pageIndex,
  pageCount,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  compact = false,
  className = "",
}: {
  pageIndex: number;
  pageCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
  className?: string;
}) {
  const buttonClassName = compact
    ? "inline-flex h-7 w-8 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex h-9 w-10 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40";
  const iconSize = compact ? 14 : 16;

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <button
        type="button"
        className={buttonClassName}
        onClick={onPrevious}
        disabled={!canGoPrevious}
        aria-label={APP_TEXT.pagination.previous}
      >
        <ChevronLeft size={iconSize} aria-hidden="true" />
      </button>
      <span className={compact ? "text-[0.68rem] font-semibold text-stone-500" : "text-xs font-semibold text-stone-500"}>
        {APP_TEXT.pagination.pageStatus(pageIndex + PAGE_STEP, pageCount)}
      </span>
      <button
        type="button"
        className={buttonClassName}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={APP_TEXT.pagination.next}
      >
        <ChevronRight size={iconSize} aria-hidden="true" />
      </button>
    </div>
  );
}

function ParticipantMorePopover({
  count,
  participants,
  onRemove,
}: {
  count: number;
  participants: Participant[];
  onRemove: (participantId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;

      setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (count > 0) return;

    setIsOpen(false);
  }, [count]);

  return (
    <div
      ref={rootRef}
      className="participant-more"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="inline-flex h-7 w-full items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-2 text-xs font-semibold text-stone-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        aria-haspopup="dialog"
        aria-label={APP_TEXT.people.showAllAria(participants.length)}
        onClick={() => setIsOpen((current) => !current)}
      >
        +{count}
      </button>

      {isOpen && (
        <div id={popoverId} className="participant-more-content" role="dialog" aria-label={APP_TEXT.people.fullTitle}>
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-2.5 py-2">
            <span className="text-xs font-semibold text-stone-950">{APP_TEXT.people.fullTitle}</span>
            <span className="text-[0.68rem] font-semibold text-stone-500">
              {APP_TEXT.game.participantsCount(participants.length)}
            </span>
          </div>
          <div className="participant-more-list">
            {participants.map((participant) => (
              <div key={participant.id} className="participant-more-item">
                <img
                  className="h-7 w-7 shrink-0 rounded-full bg-stone-100"
                  src={buildAvatarDataUri(
                    getParticipantAvatarSeed(participant),
                    APP_TEXT.people.avatarAlt(participant.name),
                  )}
                  alt=""
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-950">{participant.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(participant.id)}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                  aria-label={APP_TEXT.people.removeAria(participant.name)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
      {children}
    </div>
  );
}

function ParticipantPanel({
  game,
  form,
  onChange,
  onSubmit,
  onRemove,
}: {
  game: Game;
  form: ParticipantForm;
  onChange: (form: ParticipantForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (participantId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-emerald-700" />
        <h3 className="text-lg font-semibold text-stone-950">{APP_TEXT.people.fullTitle}</h3>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label={APP_TEXT.people.nameLabel} icon={UserRoundCheck}>
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value, avatarSeed: "" })}
            className="field"
            placeholder={APP_TEXT.people.namePlaceholder}
          />
        </Field>
        <div className="sm:self-end">
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:h-10 sm:w-auto"
          >
            <Plus size={17} />
            {APP_TEXT.people.add}
          </button>
        </div>
        <AvatarSuggestionPicker
          name={form.name}
          selectedSeed={form.avatarSeed}
          onSelect={(avatarSeed) => onChange({ ...form, avatarSeed })}
        />
      </form>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {game.participants.map((participant) => {
          const avatarSeed = getParticipantAvatarSeed(participant);

          return (
            <div key={participant.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    className="h-11 w-11 shrink-0 rounded-full bg-stone-100"
                    src={buildAvatarDataUri(avatarSeed, APP_TEXT.people.avatarAlt(participant.name))}
                    alt={APP_TEXT.people.avatarAlt(participant.name)}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold leading-snug text-stone-950">
                      {participant.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{APP_TEXT.fallback.participant}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(participant.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                  aria-label={APP_TEXT.people.removeAria(participant.name)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AvatarSuggestionPicker({
  name,
  selectedSeed,
  onSelect,
}: {
  name: string;
  selectedSeed?: string;
  onSelect: (avatarSeed: string) => void;
}) {
  const cleanName = name.trim();
  if (!cleanName) return null;

  const suggestions = getAvatarSuggestionSeeds(cleanName);
  const activeSeed = selectedSeed || suggestions[0];

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-sm font-medium text-stone-700">{APP_TEXT.people.avatarSuggestions}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((avatarSeed, index) => {
          const checked = avatarSeed === activeSeed;

          return (
            <button
              key={avatarSeed}
              type="button"
              onClick={() => onSelect(avatarSeed)}
              className={`h-14 w-14 rounded-full border p-1 transition ${
                checked
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
              aria-label={APP_TEXT.people.chooseAvatarAria(index + 1)}
            >
              <img
                className="h-full w-full rounded-full"
                src={buildAvatarDataUri(avatarSeed, APP_TEXT.people.avatarSuggestionAlt(index + 1))}
                alt=""
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentProfilePanel({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: (updater: (game: Game) => Game, options?: GameUpdateOptions) => void;
}) {
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const selectedBankId = resolveVietQrBankId(paymentProfile.bankId);
  const saveToastTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (saveToastTimeoutRef.current) {
        window.clearTimeout(saveToastTimeoutRef.current);
      }
    },
    [],
  );

  function showPaymentProfileSavedToast() {
    if (saveToastTimeoutRef.current) {
      window.clearTimeout(saveToastTimeoutRef.current);
    }

    saveToastTimeoutRef.current = window.setTimeout(() => {
      toast.success(APP_TEXT.toast.paymentProfileSaved, {
        id: PAYMENT_PROFILE_SAVE_TOAST_ID,
        description: APP_TEXT.toast.paymentProfileSavedDescription,
        duration: 1600,
      });
    }, SAVE_TOAST_DELAY_MS);
  }

  function updatePaymentProfile(patch: Partial<PaymentProfile>) {
    onUpdate(
      (current) => ({
        ...current,
        paymentProfile: {
          ...emptyPaymentProfile,
          ...current.paymentProfile,
          ...patch,
        },
      }),
      { onSaved: showPaymentProfileSavedToast },
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <WalletCards size={18} className="text-emerald-700" />
        <h3 className="text-lg font-semibold text-stone-950">{APP_TEXT.payment.title}</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label={APP_TEXT.payment.bankLabel} icon={Landmark}>
          <BankSearchSelect
            value={selectedBankId}
            onValueChange={(bankId) => updatePaymentProfile({ bankId })}
            options={VIETQR_BANK_OPTIONS}
            placeholder={APP_TEXT.payment.bankPlaceholder}
          />
        </Field>
        <Field label={APP_TEXT.payment.accountNoLabel} icon={CreditCard}>
          <input
            value={paymentProfile.accountNo}
            onChange={(event) => updatePaymentProfile({ accountNo: event.target.value })}
            className="field"
            placeholder={APP_TEXT.payment.accountNoPlaceholder}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={APP_TEXT.payment.accountNameLabel} icon={UserRoundCheck}>
            <input
              value={paymentProfile.accountName}
              onChange={(event) => updatePaymentProfile({ accountName: event.target.value })}
              className="field"
              placeholder={APP_TEXT.payment.accountNamePlaceholder}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

function ExpensePanel({
  game,
  form,
  onChange,
  onToggleSplit,
  onSubmit,
  onRemove,
  onEdit,
  onCancelEdit,
  editingExpenseId,
  templates,
  aiText,
  isAiExpenseLoading,
  isAiReceiptLoading,
  onAiTextChange,
  onSuggestWithAi,
  onScanReceipt,
  onApplyTemplate,
  onSaveTemplate,
  onRemoveTemplate,
  showAdvancedTools = true,
}: {
  game: Game;
  form: ExpenseForm;
  onChange: (form: ExpenseForm) => void;
  onToggleSplit: (participantId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (expenseId: string) => void;
  onEdit: (expenseId: string) => void;
  onCancelEdit: () => void;
  editingExpenseId: string;
  templates?: ExpenseTemplate[];
  aiText?: string;
  isAiExpenseLoading?: boolean;
  isAiReceiptLoading?: boolean;
  onAiTextChange?: (value: string) => void;
  onSuggestWithAi?: () => void;
  onScanReceipt?: (file: File) => void;
  onApplyTemplate?: (template: ExpenseTemplate) => void;
  onSaveTemplate?: () => void;
  onRemoveTemplate?: (templateId: string) => void;
  showAdvancedTools?: boolean;
}) {
  const payerId = form.payerId || game.participants[0]?.id || "";
  const isEditing = Boolean(editingExpenseId);
  const hasAiTools = Boolean(onAiTextChange && onSuggestWithAi && onScanReceipt);
  const hasTemplateTools = Boolean(onApplyTemplate && onSaveTemplate && onRemoveTemplate);
  const shouldShowAdvancedTools = showAdvancedTools && (hasAiTools || hasTemplateTools);
  const visibleTemplates = templates || [];
  const expensePagination = useExpensePagination(game.expenses.length, EXPENSE_PANEL_PAGE_SIZE, game.id);
  const visibleExpenses = game.expenses.slice(expensePagination.pageStart, expensePagination.pageEnd);

  function handleApplySuggestion(suggestion: ExpenseSuggestion) {
    const allParticipantIds = game.participants.map((participant) => participant.id);

    onChange({
      ...form,
      title: suggestion.title,
      amount: formatMoney(suggestion.amount),
      categoryId: suggestion.categoryId,
      payerId,
      splitParticipantIds: form.splitParticipantIds.length > 0 ? form.splitParticipantIds : allParticipantIds,
    });
    showInfoToast(APP_TEXT.toast.suggestionApplied, suggestion.title);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-blue-700" />
        <h3 className="text-lg font-semibold text-stone-950">{APP_TEXT.expense.title}</h3>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-stone-700">{APP_TEXT.expense.quickSuggestions}</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {EXPENSE_SUGGESTIONS.map((suggestion) => {
            const Icon = getExpenseCategoryIcon(suggestion.categoryId);

            return (
              <button
                key={`${suggestion.categoryId}-${suggestion.title}`}
                type="button"
                onClick={() => handleApplySuggestion(suggestion)}
                disabled={game.participants.length === 0}
                className="flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-emerald-700">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold leading-snug text-stone-950">
                    {suggestion.title}
                  </span>
                  <span className="mt-1 block break-words text-xs leading-snug text-stone-500">
                    {getExpenseCategoryLabel(suggestion.categoryId)} - {formatMoney(suggestion.amount)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shouldShowAdvancedTools && (
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          {hasAiTools && (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-950">
                <Sparkles size={16} className="text-emerald-700" />
                {APP_TEXT.expense.aiTitle}
              </div>
              <textarea
                value={aiText}
                onChange={(event) => onAiTextChange?.(event.target.value)}
                className="field min-h-20 resize-none bg-white"
                placeholder={APP_TEXT.expense.aiPlaceholder}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onSuggestWithAi}
                  disabled={isAiExpenseLoading}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  <Sparkles size={15} />
                  {isAiExpenseLoading ? APP_TEXT.expense.aiSuggestLoading : APP_TEXT.expense.aiSuggest}
                </button>
                <label className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
                  <Upload size={15} />
                  {isAiReceiptLoading ? APP_TEXT.expense.aiReceiptLoading : APP_TEXT.expense.aiReceipt}
                  <input
                    type="file"
                    accept={RECEIPT_IMAGE_ACCEPT}
                    className="hidden"
                    disabled={isAiReceiptLoading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (file) onScanReceipt?.(file);
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {hasTemplateTools && (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                  <Save size={16} className="text-emerald-700" />
                  {APP_TEXT.expense.templateTitle}
                </p>
                <button
                  type="button"
                  onClick={onSaveTemplate}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  <Plus size={13} />
                  {APP_TEXT.expense.saveTemplate}
                </button>
              </div>
              <div className="grid max-h-36 gap-2 overflow-y-auto pr-1">
                {visibleTemplates.length > 0 ? (
                  visibleTemplates.map((template) => (
                    <div key={template.id} className="flex min-w-0 items-center gap-2 rounded-md bg-white p-2">
                      <button
                        type="button"
                        onClick={() => onApplyTemplate?.(template)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ExpenseCategoryIcon
                          categoryId={template.categoryId}
                          size={15}
                          className="shrink-0 text-emerald-700"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-stone-950">{template.title}</span>
                          <span className="block truncate text-xs text-stone-500">
                            {getExpenseCategoryLabel(template.categoryId)} - {formatMoney(template.amount)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveTemplate?.(template.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                        aria-label={APP_TEXT.expense.removeTemplateAria(template.title)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md bg-white px-3 py-2 text-sm text-stone-500">
                    {APP_TEXT.expense.templateEmpty}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label={APP_TEXT.expense.contentLabel} icon={ReceiptText}>
          <input
            data-expense-title-input="true"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder={APP_TEXT.expense.contentPlaceholder}
          />
        </Field>
        <Field label={APP_TEXT.expense.amountLabel} icon={Banknote}>
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: formatMoneyInput(event.target.value) })}
            className="field"
            inputMode="numeric"
            placeholder={formatMoney(AMOUNT_PLACEHOLDER_VALUE)}
          />
        </Field>
        <Field label={APP_TEXT.expense.spentAtLabel} icon={CalendarClock}>
          <input
            value={form.createdAt}
            onChange={(event) => onChange({ ...form, createdAt: event.target.value })}
            className="field"
            type="datetime-local"
          />
        </Field>
        <Field label={APP_TEXT.expense.categoryLabel} icon={Tags}>
          <div role="radiogroup" aria-label={APP_TEXT.expense.categoryLabel} className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={form.categoryId === category.id}
                onClick={() => onChange({ ...form, categoryId: normalizeExpenseCategoryId(category.id) })}
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                  form.categoryId === category.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <ExpenseCategoryIcon categoryId={category.id} size={14} />
                {category.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={APP_TEXT.expense.payerLabel} icon={WalletCards}>
          <AppSelect
            value={payerId}
            onValueChange={(value) => onChange({ ...form, payerId: value })}
            options={game.participants.map((participant) => ({
              value: participant.id,
              label: participant.name,
            }))}
            placeholder={APP_TEXT.expense.payerPlaceholder}
            disabled={game.participants.length === 0}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">{APP_TEXT.expense.splitLabel}</p>
          <div className="flex flex-wrap gap-2">
            {game.participants.map((participant) => {
              const checked = form.splitParticipantIds.includes(participant.id);
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => onToggleSplit(participant.id)}
                  className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {checked && <Check size={14} aria-hidden="true" />}
                  {participant.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={game.participants.length === 0}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300 sm:h-10 sm:w-auto"
            >
              {isEditing ? <Check size={17} /> : <Plus size={17} />}
              {isEditing ? APP_TEXT.expense.update : APP_TEXT.expense.add}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:w-auto"
              >
                {APP_TEXT.expense.cancelEdit}
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {visibleExpenses.map((expense) => {
          const payer = game.participants.find((participant) => participant.id === expense.payerId);
          const categoryId = normalizeExpenseCategoryId(expense.categoryId);
          const categoryLabel = getExpenseCategoryLabel(categoryId);
          return (
            <div key={expense.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-950">
                      {expense.title}
                    </p>
                    <CategoryPill categoryId={categoryId} label={categoryLabel} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {APP_TEXT.expense.paidBySplit(
                      payer?.name || APP_TEXT.fallback.unknown,
                      expense.splitParticipantIds.length,
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                    <CalendarClock size={12} aria-hidden="true" />
                    {formatExpenseDateTime(expense.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onEdit(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50"
                    aria-label={APP_TEXT.expense.editAria(expense.title)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label={APP_TEXT.expense.removeAria(expense.title)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {expensePagination.shouldPaginate && (
          <PaginationControls
            pageIndex={expensePagination.pageIndex}
            pageCount={expensePagination.pageCount}
            canGoPrevious={expensePagination.canGoPrevious}
            canGoNext={expensePagination.canGoNext}
            onPrevious={expensePagination.goToPreviousPage}
            onNext={expensePagination.goToNextPage}
            className="pt-1"
          />
        )}
      </div>
    </section>
  );
}

function GameDashboard({
  game,
  readOnly = false,
  reportParticipantId = "",
  onAddReceipt,
  onRemoveReceipt,
  onReportParticipantChange,
  onCopyReport,
  onDownloadReport,
}: {
  game: Game;
  readOnly?: boolean;
  reportParticipantId?: string;
  onAddReceipt?: (participantId: string, amount: number) => void;
  onRemoveReceipt?: (receiptId: string) => void;
  onReportParticipantChange?: (participantId: string) => void;
  onCopyReport?: (game: Game) => void;
  onDownloadReport?: (game: Game, participantId: string) => void;
}) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
  const statistics = calculateGameStatistics(game);
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const receipts = game.receipts || [];
  const payers = balances
    .map((row) => {
      const collected = receiptTotals.get(row.participant.id) || 0;
      return {
        row,
        collected,
        remaining: getRemainingPayable(row.balance, collected),
      };
    })
    .filter((item) => item.remaining > 0);
  const hasOwnerQr = canBuildVietQr(paymentProfile);
  const ownerQrIssue = getVietQrPaymentIssue(paymentProfile);
  const selectedReportParticipantId = resolveReportParticipantId(game, reportParticipantId);

  return (
    <aside className="space-y-4 sm:space-y-5">
      {readOnly && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{game.name}</h1>
        </section>
      )}

      {(onCopyReport || onDownloadReport) && (
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
          {onCopyReport && (
            <button
              type="button"
              onClick={() => onCopyReport(game)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Copy size={15} />
              {APP_TEXT.summary.copyReport}
            </button>
          )}
          {onDownloadReport && (
            <>
              <div className="min-w-44 flex-1 sm:max-w-56">
                <AppSelect
                  value={selectedReportParticipantId}
                  onValueChange={onReportParticipantChange || (() => undefined)}
                  options={game.participants.map((participant) => ({
                    value: participant.id,
                    label: participant.name,
                  }))}
                  placeholder={APP_TEXT.summary.reportParticipantLabel}
                  disabled={game.participants.length === 0}
                />
              </div>
              <button
                type="button"
                onClick={() => onDownloadReport(game, selectedReportParticipantId)}
                disabled={!selectedReportParticipantId}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileDown size={15} />
                {APP_TEXT.summary.downloadReport}
              </button>
            </>
          )}
        </section>
      )}

      <PatternSummaryCard game={game} totalExpense={totalExpense} />

      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Metric label={APP_TEXT.summary.totalExpenseMetric} value={formatMoney(totalExpense)} icon={Banknote} />
        <Metric label={APP_TEXT.summary.peopleCountMetric} value={String(game.participants.length)} icon={Users} />
        <Metric label={APP_TEXT.summary.expenseCountMetric} value={String(game.expenses.length)} icon={ReceiptText} />
      </section>

      <StatisticsCard statistics={statistics} />

      <CategorySummaryCard summaries={categorySummaries} />

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <Equal size={18} className="text-emerald-700" aria-hidden="true" />
          {APP_TEXT.summary.balanceTitle}
        </h3>
        <div className="mt-4 space-y-3">
          {balances.length > 0 ? (
            balances.map((row) => {
              const collected = receiptTotals.get(row.participant.id) || 0;
              const remaining = getRemainingPayable(row.balance, collected);
              const displayBalance = row.balance < 0 ? -remaining : row.balance;

              return (
                <div key={row.participant.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <p className="min-w-0 break-words text-sm font-semibold leading-snug text-stone-950">
                      {row.participant.name}
                    </p>
                    <BalancePill value={displayBalance} />
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-stone-500 min-[420px]:grid-cols-2 min-[420px]:gap-2">
                    <span>{APP_TEXT.summary.paid(formatMoney(row.paid))}</span>
                    <span>{APP_TEXT.summary.owed(formatMoney(row.owed))}</span>
                    {collected > 0 && <span>{APP_TEXT.summary.collectedDetail(formatMoney(collected))}</span>}
                    {row.balance < 0 && <span>{APP_TEXT.summary.remainingPayable(formatMoney(remaining))}</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">{APP_TEXT.summary.noParticipants}</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <QrCode size={18} className="text-emerald-700" aria-hidden="true" />
          {APP_TEXT.summary.transferTitle}
        </h3>
        <div className="mt-4 space-y-3">
          {payers.length > 0 ? (
            payers.map(({ row, collected, remaining }) => {
              const grossAmount = Math.abs(row.balance);

              return (
                <div key={`${row.participant.id}-${remaining}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                        <ArrowUpRight size={15} className="text-red-600" aria-hidden="true" />
                        {APP_TEXT.summary.needsToPay(row.participant.name)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(remaining)}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {collected > 0
                          ? APP_TEXT.summary.grossDebtWithCollected(formatMoney(grossAmount), formatMoney(collected))
                          : APP_TEXT.summary.grossDebt(formatMoney(grossAmount))}
                      </p>
                    </div>
                  </div>
                  {!readOnly && onAddReceipt && (
                    <ReceiptAmountForm
                      participantId={row.participant.id}
                      remainingAmount={remaining}
                      onAddReceipt={onAddReceipt}
                    />
                  )}
                  {hasOwnerQr ? (
                    <img
                      className="mt-3 w-full rounded-md border border-stone-200"
                      src={buildVietQrUrl(paymentProfile, remaining, game.code)}
                      alt={APP_TEXT.summary.qrAlt}
                    />
                  ) : (
                    <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-500">
                      {ownerQrIssue}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">
              {readOnly || game.expenses.length > 0 ? APP_TEXT.summary.noTransfer : APP_TEXT.summary.addExpenseHint}
            </p>
          )}
          {receipts.length > 0 && (
            <div className="border-t border-stone-200 pt-3">
              <h4 className="text-sm font-semibold text-stone-950">{APP_TEXT.summary.collectedTitle}</h4>
              <div className="mt-2 space-y-2">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-stone-950">
                        {getParticipantName(game, receipt.participantId)}
                      </p>
                      <p className="text-xs text-stone-500">{new Date(receipt.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-700">{formatMoney(receipt.amount)}</span>
                      {!readOnly && onRemoveReceipt && (
                        <button
                          type="button"
                          onClick={() => onRemoveReceipt(receipt.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                          aria-label={APP_TEXT.aria.removeReceipt}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

function StatisticsCard({ statistics }: { statistics: ReturnType<typeof calculateGameStatistics> }) {
  const topPayer = statistics.topPayer
    ? `${statistics.topPayer.participant.name} - ${formatMoney(statistics.topPayer.amount)}`
    : APP_TEXT.statistics.empty;
  const topCategory = statistics.topCategory
    ? `${statistics.topCategory.label} - ${formatMoney(statistics.topCategory.amount)}`
    : APP_TEXT.statistics.empty;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
        <Sparkles size={18} className="text-emerald-700" aria-hidden="true" />
        {APP_TEXT.statistics.title}
      </h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <StatRow label={APP_TEXT.statistics.averagePerParticipant} value={formatMoney(statistics.averagePerParticipant)} />
        <StatRow label={APP_TEXT.statistics.topPayer} value={topPayer} />
        <StatRow label={APP_TEXT.statistics.topCategory} value={topCategory} />
        <StatRow label={APP_TEXT.statistics.transferCount} value={String(statistics.transactionCount)} />
      </div>
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-stone-50 px-3 py-2">
      <p className="truncate text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug text-stone-950">{value}</p>
    </div>
  );
}

function CategorySummaryCard({ summaries }: { summaries: ExpenseCategorySummary[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
        <Tags size={18} className="text-emerald-700" aria-hidden="true" />
        {APP_TEXT.summary.categoryTitle}
      </h3>
      <div className="mt-4 space-y-2">
        {summaries.length > 0 ? (
          summaries.map((summary) => {
            const Icon = getExpenseCategoryIcon(summary.categoryId);

            return (
              <div
                key={summary.categoryId}
                className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold leading-snug text-stone-950">{summary.label}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {APP_TEXT.summary.categoryExpenseCount(summary.count)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-stone-950">{formatMoney(summary.total)}</span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-stone-500">{APP_TEXT.summary.noExpenses}</p>
        )}
      </div>
    </section>
  );
}

function PatternSummaryCard({ game, totalExpense }: { game: Game; totalExpense: number }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="pastel-summary-pattern" aria-hidden="true" />
      <div className="p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <Banknote size={15} aria-hidden="true" />
          {APP_TEXT.summary.totalSpent}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="min-w-0 break-words text-2xl font-semibold leading-tight text-stone-950">
            {formatMoney(totalExpense)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-stone-500">
            <CalendarClock size={15} aria-hidden="true" />
            {getGameAgeLabel(game.createdAt)}
          </span>
        </div>
      </div>
    </section>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label}
      </span>
      {children}
    </div>
  );
}

function AppSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger className="select-trigger" aria-label={placeholder}>
        <Select.Value className="min-w-0 flex-1 text-left" placeholder={placeholder} />
        <Select.Icon className="shrink-0 text-stone-500">
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={6}>
          <Select.Viewport className="select-viewport">
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="select-item">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="select-item-indicator">
                  <Check size={15} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function BankSearchSelect({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
      )
    : options;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;

      setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function openOptions() {
    setSearchQuery("");
    setIsOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function selectOption(nextValue: string) {
    onValueChange(nextValue);
    setSearchQuery("");
    setIsOpen(false);
  }

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openOptions();
        }}
      >
        <span className="min-w-0 flex-1 break-words text-left leading-snug">{selectedOption?.label || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-stone-500" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="searchable-select-content">
          <div className="searchable-select-search-wrap">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false);
                  return;
                }

                if (event.key === "Enter" && filteredOptions[0]) {
                  event.preventDefault();
                  selectOption(filteredOptions[0].value);
                }
              }}
              className="field searchable-select-search"
              placeholder={APP_TEXT.bankSearch.placeholder}
              aria-label={APP_TEXT.bankSearch.ariaLabel}
            />
          </div>
          <div className="searchable-select-list" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="searchable-select-item"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectOption(option.value)}
                  >
                    <span className="min-w-0 break-words leading-snug">{option.label}</span>
                    {selected && <Check size={15} className="shrink-0" aria-hidden="true" />}
                  </button>
                );
              })
            ) : (
              <p className="searchable-select-empty">{APP_TEXT.bankSearch.empty}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 break-words text-lg font-semibold leading-snug text-stone-950">{value}</p>
    </div>
  );
}

function CategoryPill({ categoryId, label }: { categoryId: ExpenseCategoryId; label: string }) {
  const Icon = getExpenseCategoryIcon(categoryId);

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

function BalancePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        <ArrowDownLeft size={13} aria-hidden="true" />
        {APP_TEXT.balance.receive(formatMoney(value))}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        <ArrowUpRight size={13} aria-hidden="true" />
        {APP_TEXT.balance.pay(formatMoney(Math.abs(value)))}
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
      <Equal size={13} aria-hidden="true" />
      {APP_TEXT.balance.settled}
    </span>
  );
}

export default App;
