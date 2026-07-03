import {
  Banknote,
  Car,
  CircleEllipsis,
  Hotel,
  PartyPopper,
  QrCode,
  ShoppingBag,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_EXPENSE_CATEGORY_ID } from "./core/domain/expense-categories";
import type { ExpenseCategoryId, Participant, PaymentProfile } from "./core/domain/types";

export type ParticipantForm = Pick<Participant, "name" | "avatarSeed">;

export type ExpenseForm = {
  title: string;
  amount: string;
  createdAt: string;
  categoryId: ExpenseCategoryId;
  payerId: string;
  splitParticipantIds: string[];
};

export type ExpenseSuggestion = {
  title: string;
  amount: number;
  categoryId: ExpenseCategoryId;
};

export type WorkspaceTabId = "people" | "expenses" | "summary";

export type WorkspaceTabConfig = {
  id: WorkspaceTabId;
  label: string;
  icon: LucideIcon;
};

export const emptyParticipantForm: ParticipantForm = {
  name: "",
  avatarSeed: "",
};

export const emptyPaymentProfile: PaymentProfile = {
  bankId: "",
  accountNo: "",
  accountName: "",
};

export const emptyExpenseForm: ExpenseForm = {
  title: "",
  amount: "",
  createdAt: "",
  categoryId: DEFAULT_EXPENSE_CATEGORY_ID,
  payerId: "",
  splitParticipantIds: [],
};

export const MILLISECONDS_PER_DAY = 86_400_000;
export const MILLISECONDS_PER_MINUTE = 60_000;
export const DATETIME_LOCAL_INPUT_LENGTH = 16;
export const DAYS_PER_MONTH = 30;
export const AMOUNT_PLACEHOLDER_VALUE = 500_000;
export const SAVE_TOAST_DELAY_MS = 450;
export const DEFAULT_TOAST_DURATION_MS = 1800;
export const PAYMENT_PROFILE_SAVE_TOAST_ID = "payment-profile-auto-save";
export const REMOTE_SAVE_ERROR_TOAST_ID = "remote-save-error";
export const REMOTE_SYNC_TOAST_ID = "remote-sync";
export const SHARE_LINK_TOAST_ID = "share-link";
export const CREATE_REMOTE_GAME_TOAST_ID = "create-remote-game";
export const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL?.trim() || "";
export const DEFAULT_WORKSPACE_TAB: WorkspaceTabId = "people";
export const MOBILE_VISIBLE_PARTICIPANT_LIMIT = 4;
export const MOBILE_VISIBLE_EXPENSE_LIMIT = 2;
export const EXPENSE_PANEL_PAGE_SIZE = 6;
export const MOBILE_VISIBLE_BALANCE_LIMIT = 3;
export const MOBILE_VISIBLE_SUGGESTION_LIMIT = 4;

export const WORKSPACE_TABS: WorkspaceTabConfig[] = [
  { id: "people", label: "Người", icon: Users },
  { id: "expenses", label: "Chi", icon: Banknote },
  { id: "summary", label: "Tổng kết", icon: QrCode },
];

export const EXPENSE_SUGGESTIONS: ExpenseSuggestion[] = [
  { title: "Ăn sáng", amount: 100_000, categoryId: "food" },
  { title: "Ăn tối", amount: 500_000, categoryId: "food" },
  { title: "Cà phê", amount: 80_000, categoryId: "food" },
  { title: "Grab/taxi", amount: 150_000, categoryId: "transport" },
  { title: "Khách sạn", amount: 1_000_000, categoryId: "lodging" },
  { title: "Vé vui chơi", amount: 300_000, categoryId: "entertainment" },
];

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategoryId, LucideIcon> = {
  food: Utensils,
  transport: Car,
  lodging: Hotel,
  shopping: ShoppingBag,
  entertainment: PartyPopper,
  other: CircleEllipsis,
};
