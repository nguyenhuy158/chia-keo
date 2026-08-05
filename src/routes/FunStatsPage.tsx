import { Link } from "@tanstack/react-router";
import { Crown, Flame, PartyPopper, Receipt, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useFunStats } from "../adapters/react-query/fun-stats-query";
import { formatMoney } from "../core/domain/money";
import { EmptyState, LoadingState } from "../components/ui";

const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
        {icon}
        <span className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold text-stone-950 dark:text-stone-50">{value}</p>
      {detail && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{detail}</p>}
    </div>
  );
}

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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <PartyPopper className="text-violet-600 dark:text-violet-400" size={22} />
        <h1 className="text-xl font-bold text-stone-950 dark:text-stone-50">Thống kê vui</h1>
      </div>
      <p className="-mt-3 text-sm text-stone-500 dark:text-stone-400">
        Gộp {stats.gameCount} cuộc chơi gần nhất. Chỉ để xem cho vui, không dùng để tất toán.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={<Receipt size={18} />}
          label="Tổng đã chi"
          value={`${formatMoney(stats.totalExpense)}đ`}
          detail={`trên ${stats.gameCount} cuộc chơi`}
        />

        {stats.topPayer && (
          <StatCard
            icon={<Crown size={18} />}
            label="Đại gia của hội"
            value={stats.topPayer.name}
            detail={`ứng ${formatMoney(stats.topPayer.totalPaid)}đ`}
          />
        )}

        {stats.mostActive && (
          <StatCard
            icon={<Flame size={18} />}
            label="Cắm chốt nhiều nhất"
            value={stats.mostActive.name}
            detail={`góp mặt ${stats.mostActive.gameCount} cuộc chơi`}
          />
        )}

        {stats.biggestGame && (
          <StatCard
            icon={<Users size={18} />}
            label="Đông người nhất"
            value={stats.biggestGame.name}
            detail={`${stats.biggestGame.participantCount} người`}
          />
        )}

        {stats.biggestExpense && (
          <StatCard
            icon={<Sparkles size={18} />}
            label="Khoản chi khủng nhất"
            value={`${formatMoney(stats.biggestExpense.amount)}đ`}
            detail={`${stats.biggestExpense.title} · ${stats.biggestExpense.gameName}`}
          />
        )}

        {stats.favoriteWeekday !== null && (
          <StatCard
            icon={<PartyPopper size={18} />}
            label="Hay chơi nhất vào"
            value={WEEKDAY_LABELS[stats.favoriteWeekday]}
          />
        )}
      </div>

      {stats.omittedGameCount > 0 && (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Đã bỏ bớt {stats.omittedGameCount} cuộc chơi cũ hơn để tính nhanh.
        </p>
      )}

      <Link
        to="/"
        className="inline-block text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
      >
        ← Về danh sách cuộc chơi
      </Link>
    </div>
  );
}
