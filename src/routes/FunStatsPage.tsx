import { Link } from "@tanstack/react-router";
import {
  Crown,
  Flame,
  PartyPopper,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useFunStats } from "../adapters/react-query/fun-stats-query";
import { EmptyState, LoadingState } from "../components/ui";
import { formatMoney } from "../core/domain/money";
import { PagedList } from "../ui/PagedList";

const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

const COMPACT_ROW_HEIGHT_PX = 88;

type StatEntry = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
};

/**
 * Menu rieng biet: thong ke vui gop tat ca cuoc chia, khong dinh gi den logic
 * dang chay (settlement, split, hoan tac...). Chi doc, khong sua duoc gi o
 * day — bam vao ten cuoc chia trong the "khoan chi khung nhat" de sang trang
 * that neu muon xem chi tiet.
 */
export function FunStatsPage() {
  const statsQuery = useFunStats();

  if (statsQuery.isPending) return <LoadingState />;

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <EmptyState
        title="Không tải được thống kê"
        description="Thử tải lại trang."
      />
    );
  }

  const stats = statsQuery.data;

  if (stats.gameCount === 0) {
    return (
      <EmptyState
        title="Chưa có gì để thống kê"
        description="Tạo vài cuộc chơi rồi quay lại đây xem cho vui."
      />
    );
  }

  const entries: StatEntry[] = [
    {
      key: "total",
      icon: <Receipt size={18} />,
      label: "Tổng đã chi",
      value: formatMoney(stats.totalExpense),
      detail: `trên ${stats.gameCount} cuộc chơi`,
    },
    ...(stats.topPayer
      ? [
          {
            key: "top-payer",
            icon: <Crown size={18} />,
            label: "Đại gia của hội",
            value: stats.topPayer.name,
            detail: `ứng ${formatMoney(stats.topPayer.totalPaid)}`,
          },
        ]
      : []),
    ...(stats.mostActive
      ? [
          {
            key: "most-active",
            icon: <Flame size={18} />,
            label: "Cắm chốt nhiều nhất",
            value: stats.mostActive.name,
            detail: `góp mặt ${stats.mostActive.gameCount} cuộc chơi`,
          },
        ]
      : []),
    ...(stats.biggestGame
      ? [
          {
            key: "biggest-game",
            icon: <Users size={18} />,
            label: "Đông người nhất",
            value: stats.biggestGame.name,
            detail: `${stats.biggestGame.participantCount} người`,
          },
        ]
      : []),
    ...(stats.biggestExpense
      ? [
          {
            key: "biggest-expense",
            icon: <Sparkles size={18} />,
            label: "Khoản chi khủng nhất",
            value: formatMoney(stats.biggestExpense.amount),
            detail: `${stats.biggestExpense.title} · ${stats.biggestExpense.gameName}`,
          },
        ]
      : []),
    ...(stats.favoriteWeekday !== null
      ? [
          {
            key: "weekday",
            icon: <PartyPopper size={18} />,
            label: "Hay chơi nhất vào",
            value: WEEKDAY_LABELS[stats.favoriteWeekday],
          },
        ]
      : []),
  ];

  return (
    <div data-one-screen className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <PartyPopper
          className="text-violet-600 dark:text-violet-400"
          size={20}
        />
        <h1 className="text-lg font-bold text-stone-950 dark:text-stone-50">
          Thống kê vui
        </h1>
      </div>
      <p className="shrink-0 text-xs text-fg-muted">
        Gộp {stats.gameCount} cuộc chơi gần nhất. Chỉ để xem cho vui, không dùng
        để tất toán.
        {stats.omittedGameCount > 0 &&
          ` Đã bỏ bớt ${stats.omittedGameCount} cuộc chơi cũ hơn.`}
      </p>
      <div className="min-h-0 flex-1">
        <PagedList
          items={entries}
          getKey={(entry) => entry.key}
          rowHeight={COMPACT_ROW_HEIGHT_PX}
          renderItem={(entry) => (
            <div className="flex h-full flex-col justify-center rounded-lg border border-border bg-surface px-3">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                {entry.icon}
                <span className="truncate text-xs font-medium text-fg-muted">
                  {entry.label}
                </span>
              </div>
              <p className="truncate text-lg font-bold text-stone-950 dark:text-stone-50">
                {entry.value}
              </p>
              {entry.detail && (
                <p className="truncate text-xs text-fg-muted">{entry.detail}</p>
              )}
            </div>
          )}
        />
      </div>
      <Link
        to="/"
        className="inline-flex h-11 shrink-0 items-center justify-center text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
      >
        ← Về danh sách cuộc chơi
      </Link>
    </div>
  );
}
