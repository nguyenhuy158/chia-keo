/**
 * Danh muc chi tieu ("an uong", "di lai"...) va thong ke gop theo danh muc.
 * Thuan tinh toan, khong IO — giong shared/fun-stats.ts: worker lay row tho tu
 * D1 roi dua vao day, FE goi thang cung ham do tren du lieu da tai ve.
 *
 * Danh muc la mot enum co dinh chu khong phai chuoi tu do: nguoi dung go tay
 * thi "An uong"/"Ăn uống"/"an uong" thanh ba nhom khac nhau, bieu do lap tuc
 * vo nghia. Chuoi rong la "chua phan loai" — moi khoan chi cu deu roi vao day
 * nen khong can migration du lieu.
 */

export const EXPENSE_CATEGORY_IDS = [
  "food",
  "drink",
  "transport",
  "stay",
  "fun",
  "shopping",
  "health",
  "other",
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORY_IDS)[number];
/** "" la chua phan loai; khong dung null de khop cot text NOT NULL DEFAULT ''. */
export type ExpenseCategory = ExpenseCategoryId | "";

export const UNCATEGORIZED_LABEL = "Chưa phân loại";

export type ExpenseCategoryMeta = {
  id: ExpenseCategoryId;
  label: string;
  emoji: string;
  /** Mau bieu do va badge; giu ca hai to sang/toi trong cung mot cho. */
  barClassName: string;
  badgeClassName: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  {
    id: "food",
    label: "Ăn uống",
    emoji: "🍜",
    barClassName: "bg-amber-500",
    badgeClassName:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  {
    id: "drink",
    label: "Cà phê, nhậu",
    emoji: "🍻",
    barClassName: "bg-orange-500",
    badgeClassName:
      "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  },
  {
    id: "transport",
    label: "Đi lại",
    emoji: "🚕",
    barClassName: "bg-sky-500",
    badgeClassName: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  {
    id: "stay",
    label: "Chỗ ở",
    emoji: "🏨",
    barClassName: "bg-violet-500",
    badgeClassName:
      "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  {
    id: "fun",
    label: "Vui chơi",
    emoji: "🎡",
    barClassName: "bg-pink-500",
    badgeClassName:
      "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200",
  },
  {
    id: "shopping",
    label: "Mua sắm",
    emoji: "🛍️",
    barClassName: "bg-emerald-500",
    badgeClassName:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    id: "health",
    label: "Thuốc men",
    emoji: "💊",
    barClassName: "bg-rose-500",
    badgeClassName:
      "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  },
  {
    id: "other",
    label: "Khác",
    emoji: "📦",
    barClassName: "bg-stone-500",
    badgeClassName:
      "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
  },
];

const CATEGORY_BY_ID = new Map(EXPENSE_CATEGORIES.map((row) => [row.id, row]));

/** Danh muc khong biet (du lieu cu, client la) duoc coi nhu chua phan loai. */
export function normalizeCategory(value: string | null | undefined): ExpenseCategory {
  const id = (value || "").trim();
  return CATEGORY_BY_ID.has(id as ExpenseCategoryId) ? (id as ExpenseCategoryId) : "";
}

export function categoryMeta(value: string | null | undefined): ExpenseCategoryMeta | null {
  const id = normalizeCategory(value);
  return id ? CATEGORY_BY_ID.get(id) || null : null;
}

export function categoryLabel(value: string | null | undefined) {
  return categoryMeta(value)?.label ?? UNCATEGORIZED_LABEL;
}

export type CategoryExpenseInput = {
  kind: string;
  amount: number;
  category: string;
};

export type CategoryBreakdownRow = {
  /** "" la nhom chua phan loai. */
  category: ExpenseCategory;
  label: string;
  emoji: string;
  barClassName: string;
  total: number;
  count: number;
  /** Phan tram lam tron cua tong, chi de ve thanh ngang va hien text. */
  percent: number;
};

export type CategoryBreakdown = {
  total: number;
  rows: CategoryBreakdownRow[];
};

const UNCATEGORIZED_META = {
  label: UNCATEGORIZED_LABEL,
  emoji: "❔",
  barClassName: "bg-stone-400 dark:bg-stone-600",
};

/**
 * Gop tien theo danh muc. Chi tinh khoan "expense": "income" la tien vao va
 * "transfer" chi la chuyen tien noi bo — cong ca hai vao thi thanh phan tram
 * khong con la "nhom da tieu vao cai gi" nua.
 *
 * Nhom rong bi bo, nhom lon truoc; chua phan loai luon xuong cuoi du to hay
 * nho vi do khong phai mot "loai chi tieu" de so sanh.
 */
export function buildCategoryBreakdown(expenses: CategoryExpenseInput[]): CategoryBreakdown {
  const totals = new Map<ExpenseCategory, { total: number; count: number }>();
  let total = 0;

  for (const row of expenses) {
    if (row.kind !== "expense") continue;
    const category = normalizeCategory(row.category);
    const entry = totals.get(category) || { total: 0, count: 0 };
    entry.total += row.amount;
    entry.count += 1;
    totals.set(category, entry);
    total += row.amount;
  }

  const order = new Map(EXPENSE_CATEGORY_IDS.map((id, index) => [id, index]));
  const rows: CategoryBreakdownRow[] = [...totals.entries()]
    .filter(([, entry]) => entry.total > 0)
    .sort((left, right) => {
      if (left[0] === "") return 1;
      if (right[0] === "") return -1;
      if (right[1].total !== left[1].total) return right[1].total - left[1].total;
      // Tong bang nhau thi giu thu tu khai bao cho on dinh giua cac lan render.
      return (order.get(left[0]) ?? 0) - (order.get(right[0]) ?? 0);
    })
    .map(([category, entry]) => {
      const meta = category ? CATEGORY_BY_ID.get(category) : null;
      return {
        category,
        label: meta?.label ?? UNCATEGORIZED_META.label,
        emoji: meta?.emoji ?? UNCATEGORIZED_META.emoji,
        barClassName: meta?.barClassName ?? UNCATEGORIZED_META.barClassName,
        total: entry.total,
        count: entry.count,
        percent: total > 0 ? Math.round((entry.total / total) * 100) : 0,
      };
    });

  return { total, rows };
}
