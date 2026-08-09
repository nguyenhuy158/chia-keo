import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Crown,
  Flame,
  ListChecks,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCrossBalances } from "../adapters/react-query/cross-balances-query";
import { useFunStats } from "../adapters/react-query/fun-stats-query";
import { useGames } from "../adapters/react-query/queries";
import { Avatar } from "../components/Avatar";
import { useMobileShell } from "../components/mobile-shell";
import { EmptyState, SkeletonCard } from "../components/ui";
import { formatMoney } from "../core/domain/money";

/** Bao nhieu cuoc gan nhat hien o phan "tiep tuc". Du de nhan ra, khong tran man hinh. */
const RECENT_LIMIT = 4;
/** Bao nhieu nguoi hien o phan cong no truoc khi cat bot. */
const DEBT_LIMIT = 5;

function greet(hour: number) {
  if (hour < 5) return "Khuya rồi";
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950 dark:text-stone-50">
          <span className="text-violet-600 dark:text-violet-400">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
        {icon}
        <span className="truncate text-xs font-medium text-stone-500 dark:text-stone-400">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-lg font-bold text-stone-950 dark:text-stone-50">{value}</p>
    </div>
  );
}

/**
 * Trang chu: truoc day chi co mot khung rong "Bat dau mot cuoc choi", nen mo
 * app xong khong biet di dau. Gio tra loi ba cau hoi theo thu tu nguoi dung
 * thuc su hoi: dang do o dau, con no ai, va vai con so cho vui.
 *
 * Moi phan tu an khi khong co du lieu — nguoi moi van thay dung mot khung
 * huong dan nhu cu chu khong phai mot dong khung rong.
 */
export function HomePage() {
  const shell = useMobileShell();
  const gamesQuery = useGames();
  const funStatsQuery = useFunStats();

  const games = gamesQuery.data || [];
  const hasGames = games.length > 0;
  // Chua co cuoc nao thi khong goi API cong no: chac chan rong, goi chi ton mot round-trip.
  const balancesQuery = useCrossBalances(hasGames);

  const recent = games.slice(0, RECENT_LIMIT);
  const stats = funStatsQuery.data;
  const people = balancesQuery.data?.people || [];
  const owedToMe = people.filter((person) => person.net > 0).slice(0, DEBT_LIMIT);
  const owedByMe = people.filter((person) => person.net < 0).slice(0, DEBT_LIMIT);
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] lg:hidden"
        >
          <ListChecks size={18} />
          Mở danh sách cuộc chơi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-950 dark:text-stone-50">
          {greet(new Date().getHours())} 👋
        </h1>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          {games.length} cuộc chơi · nhấn để tiếp tục chỗ đang dở.
        </p>
      </div>

      <Section title="Tiếp tục" icon={<ArrowRight size={16} />}>
        <div className="grid gap-2 sm:grid-cols-2">
          {recent.map((game) => (
            <Link
              key={game.id}
              to="/games/$gameId"
              params={{ gameId: game.id }}
              className="group rounded-lg border border-stone-200 bg-white p-3 transition hover:border-violet-600 hover:bg-violet-50 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
            >
              <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                {game.name}
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {game.participantCount} người · {game.expenseCount} khoản
              </p>
            </Link>
          ))}
        </div>
      </Section>

      {hasDebts && (
        <Section title="Cần tất toán" icon={<Users size={16} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {owedToMe.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={14} />
                  Được nhận lại
                </p>
                <ul className="space-y-1.5">
                  {owedToMe.map((person) => (
                    <li key={person.name} className="flex items-center gap-2">
                      <Avatar name={person.name} size={26} />
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-900 dark:text-stone-100">
                        {person.name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(person.net)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {owedByMe.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <TrendingDown size={14} />
                  Còn phải trả
                </p>
                <ul className="space-y-1.5">
                  {owedByMe.map((person) => (
                    <li key={person.name} className="flex items-center gap-2">
                      <Avatar name={person.name} size={26} />
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-900 dark:text-stone-100">
                        {person.name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-rose-600 dark:text-rose-400">
                        {formatMoney(Math.abs(person.net))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {stats && stats.totalExpense > 0 && (
        <Section
          title="Vài con số"
          icon={<Sparkles size={16} />}
          action={
            <Link
              to="/fun"
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Xem hết
            </Link>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
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
          </div>
        </Section>
      )}

      <button
        type="button"
        onClick={() => shell?.openGames()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] lg:hidden"
      >
        <ListChecks size={18} />
        Mở danh sách cuộc chơi
      </button>
    </div>
  );
}
