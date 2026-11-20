import { Link } from "@tanstack/react-router";
import { Crown, Flame, ListChecks, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { isCollectionDone } from "../../../shared/game-closing";
import { useCrossBalances } from "../adapters/react-query/cross-balances-query";
import { useFunStats } from "../adapters/react-query/fun-stats-query";
import { useGames, usePreferences } from "../adapters/react-query/queries";
import { Avatar } from "../components/Avatar";
import { useMobileShell } from "../components/mobile-shell";
import { EmptyState, SkeletonCard } from "../components/ui";
import { formatMoney } from "../core/domain/money";
import { PagedList } from "../ui/PagedList";

/** Bao nhieu cuoc gan nhat hien o phan "tiep tuc". Du de nhan ra, khong tran man hinh. */
/** Bao nhieu nguoi hien o phan cong no truoc khi cat bot. */
const DEBT_LIMIT = 5;

const COMPACT_ROW_HEIGHT_PX = 60;

type HomeView = "recent" | "debts" | "stats";

type DebtRow = { name: string; net: number };

function greet(hour: number) {
  if (hour < 5) return "Khuya rồi";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/**
 * Trang chu: truoc day chi co mot khung rong "Bat dau mot cuoc choi", nen mo
 * app xong khong biet di dau. Gio tra loi ba cau hoi theo thu tu nguoi dung
 * thuc su hoi: dang do o dau, con no ai, va vai con so cho vui.
 *
 * Moi phan tu an khi khong co du lieu — nguoi moi van thay dung mot khung
 * huong dan nhu cu chu khong phai mot dong khung rong.
 */
function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-stone-50 p-3 dark:bg-stone-950">
      <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
        {icon}
        <span className="truncate text-xs font-medium text-fg-muted">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-lg font-bold text-stone-950 dark:text-stone-50">
        {value}
      </p>
    </div>
  );
}

export function HomePage() {
  const shell = useMobileShell();
  const [view, setView] = useState<HomeView>("recent");
  const gamesQuery = useGames();
  const funStatsQuery = useFunStats();

  const { hideSettledGames } = usePreferences();
  const allGames = gamesQuery.data || [];
  const games = hideSettledGames
    ? allGames.filter((game) => !isCollectionDone(game))
    : allGames;
  const hiddenCount = allGames.length - games.length;
  const hasGames = allGames.length > 0;
  // Chua co cuoc nao thi khong goi API cong no: chac chan rong, goi chi ton mot round-trip.
  const balancesQuery = useCrossBalances(hasGames);

  const stats = funStatsQuery.data;
  const people = balancesQuery.data?.people || [];
  const owedToMe = people
    .filter((person) => person.net > 0)
    .slice(0, DEBT_LIMIT);
  const owedByMe = people
    .filter((person) => person.net < 0)
    .slice(0, DEBT_LIMIT);
  const hasDebts = owedToMe.length > 0 || owedByMe.length > 0;

  if (gamesQuery.isPending) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!hasGames) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Bắt đầu một cuộc chơi"
          description="Chọn một cuộc chơi hoặc tạo cuộc chơi mới để thêm người và khoản chi."
        />
        <button
          type="button"
          onClick={() => shell?.openGames()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-[0.99] lg:hidden"
        >
          <ListChecks size={18} />
          Mở danh sách cuộc chơi
        </button>
      </div>
    );
  }

  const hasStats = Boolean(stats && stats.totalExpense > 0);
  const views: Array<{ id: HomeView; label: string }> = [
    { id: "recent", label: "Tiếp tục" },
    ...(hasDebts ? [{ id: "debts" as const, label: "Cần tất toán" }] : []),
    ...(hasStats ? [{ id: "stats" as const, label: "Vài con số" }] : []),
  ];
  const activeView = views.some((item) => item.id === view) ? view : "recent";
  const debtRows: DebtRow[] = [...owedToMe, ...owedByMe];

  const compact = (
    <div data-one-screen className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0">
        <h1 className="text-lg font-bold text-stone-950 dark:text-stone-50">
          {greet(new Date().getHours())} 👋
        </h1>
        <p className="text-xs text-fg-muted">
          {games.length} cuộc chơi · nhấn để tiếp tục chỗ đang dở.
          {hiddenCount > 0 && ` Đang ẩn ${hiddenCount} cuộc đã thu xong.`}
        </p>
      </div>
      {views.length > 1 && (
        <div className="flex shrink-0 gap-1 rounded-lg bg-surface-muted p-1">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={activeView === item.id}
              onClick={() => setView(item.id)}
              className={`inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md px-1 text-[13px] font-semibold transition ${
                activeView === item.id
                  ? "bg-surface text-violet-700 shadow-sm dark:text-violet-300"
                  : "text-fg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {activeView === "recent" && (
          <PagedList
            items={games}
            getKey={(game) => game.id}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            renderItem={(game) => (
              <Link
                to="/games/$gameId"
                params={{ gameId: game.id }}
                className="flex h-full flex-col justify-center rounded-lg border border-border px-3 transition active:bg-surface-muted"
              >
                <span className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                  {game.name}
                </span>
                <span className="text-xs text-fg-muted">
                  {game.participantCount} người · {game.expenseCount} khoản
                </span>
              </Link>
            )}
          />
        )}
        {activeView === "debts" && (
          <PagedList
            items={debtRows}
            getKey={(person) => `${person.name}-${person.net}`}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            renderItem={(person) => (
              <div className="flex h-full items-center gap-2 rounded-lg border border-border px-3">
                <Avatar name={person.name} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-stone-900 dark:text-stone-100">
                    {person.name}
                  </p>
                  <p
                    className={`text-xs font-medium ${person.net > 0 ? "text-success" : "text-danger"}`}
                  >
                    {person.net > 0 ? "Được nhận lại" : "Còn phải trả"}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${person.net > 0 ? "text-success" : "text-danger"}`}
                >
                  {formatMoney(Math.abs(person.net))}
                </span>
              </div>
            )}
          />
        )}
        {activeView === "stats" && stats && (
          <div className="space-y-2">
            <StatTile
              icon={<Receipt size={14} />}
              label="Tổng chi"
              value={formatMoney(stats.totalExpense)}
            />
            {stats.topPayer && (
              <StatTile
                icon={<Crown size={14} />}
                label="Ứng tiền nhiều nhất"
                value={stats.topPayer.name}
              />
            )}
            {stats.biggestExpense && (
              <StatTile
                icon={<Flame size={14} />}
                label="Khoản khủng nhất"
                value={formatMoney(stats.biggestExpense.amount)}
              />
            )}
            <Link
              to="/fun"
              className="block text-center text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Xem hết
            </Link>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => shell?.openGames()}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-[0.99] lg:hidden"
      >
        <ListChecks size={18} />
        Mở danh sách cuộc chơi
      </button>
    </div>
  );

  return compact;
}
