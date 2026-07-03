import {
  Banknote,
  Check,
  ChevronDown,
  Copy,
  Link,
  LogOut,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { type FormEvent, type ReactNode, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { buildAvatarDataUri, createAvatarSeed, getAvatarSuggestionSeeds } from "./lib/avatar";
import {
  DEFAULT_EXPENSE_CATEGORY_ID,
  EXPENSE_CATEGORIES,
  getExpenseCategoryLabel,
  normalizeExpenseCategoryId,
} from "./lib/expense-categories";
import { formatMoney, formatMoneyInput, parseMoney } from "./lib/money";
import { decodeShareGame, encodeShareGame } from "./lib/share";
import { calculateBalances } from "./lib/split";
import { clearSession, loadGames, loadSession, loginOrCreateLocalUser, saveGames } from "./lib/storage";
import { buildVietQrUrl, canBuildVietQr } from "./lib/vietqr";
import type { Expense, ExpenseCategoryId, Game, Participant, PaymentProfile } from "./types";

type ParticipantForm = Pick<Participant, "name" | "avatarSeed">;

type ExpenseForm = {
  title: string;
  amount: string;
  categoryId: ExpenseCategoryId;
  payerId: string;
  splitParticipantIds: string[];
};

type ExpenseCategorySummary = {
  categoryId: ExpenseCategoryId;
  label: string;
  total: number;
  count: number;
};

type ExpenseSuggestion = {
  title: string;
  amount: number;
  categoryId: ExpenseCategoryId;
};

type SelectOption = {
  value: string;
  label: string;
};

const emptyParticipantForm: ParticipantForm = {
  name: "",
  avatarSeed: "",
};

const emptyPaymentProfile: PaymentProfile = {
  bankId: "",
  accountNo: "",
  accountName: "",
};

const emptyExpenseForm: ExpenseForm = {
  title: "",
  amount: "",
  categoryId: DEFAULT_EXPENSE_CATEGORY_ID,
  payerId: "",
  splitParticipantIds: [],
};

const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30;
const AMOUNT_PLACEHOLDER_VALUE = 500_000;
const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL?.trim() || "";
const EXPENSE_SUGGESTIONS: ExpenseSuggestion[] = [
  { title: "Ăn sáng", amount: 100_000, categoryId: "food" },
  { title: "Ăn tối", amount: 500_000, categoryId: "food" },
  { title: "Cà phê", amount: 80_000, categoryId: "food" },
  { title: "Grab/taxi", amount: 150_000, categoryId: "transport" },
  { title: "Khách sạn", amount: 1_000_000, categoryId: "lodging" },
  { title: "Vé vui chơi", amount: 300_000, categoryId: "entertainment" },
];

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

function createGame(name: string): Game {
  return {
    id: createId("game"),
    code: createGameCode(),
    name,
    paymentProfile: { ...emptyPaymentProfile },
    participants: [],
    expenses: [],
    shareToken: createId("share").replace("share_", ""),
    createdAt: new Date().toISOString(),
  };
}

function getGameAgeLabel(createdAt: string) {
  const createdTime = Date.parse(createdAt);
  if (Number.isNaN(createdTime)) return "Mới tạo";

  const elapsedDays = Math.max(0, Math.floor((Date.now() - createdTime) / MILLISECONDS_PER_DAY));
  if (elapsedDays === 0) return "Hôm nay";
  if (elapsedDays < DAYS_PER_MONTH) return `${elapsedDays} ngày`;

  return `${Math.floor(elapsedDays / DAYS_PER_MONTH)} tháng`;
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

function getParticipantAvatarSeed(participant: Participant) {
  return participant.avatarSeed || createAvatarSeed(participant.name);
}

function App() {
  const [games, setGames] = useState<Game[]>(() => loadGames());
  const [session, setSession] = useState(() => loadSession());
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(() => loadGames()[0]?.id || "");
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(emptyParticipantForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [copiedShare, setCopiedShare] = useState(false);
  const { shareToken = "" } = useParams();
  const [searchParams] = useSearchParams();

  const isShareMode = Boolean(shareToken);
  const selectedGame =
    games.find((game) => game.id === selectedGameId) ||
    games.find((game) => game.shareToken === shareToken) ||
    games[0];

  function persistGames(nextGames: Game[]) {
    setGames(nextGames);
    saveGames(nextGames);
  }

  function updateSelectedGame(updater: (game: Game) => Game) {
    if (!selectedGame) return;

    persistGames(games.map((game) => (game.id === selectedGame.id ? updater(game) : game)));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = loginName.trim();
    const password = loginPassword.trim();
    const result = await loginOrCreateLocalUser(username, password);

    if (!result.ok) {
      setAuthError(result.error || "Đăng nhập thất bại.");
      return;
    }

    setAuthError("");
    setLoginPassword("");
    setSession(result.username || username);
  }

  function handleLogout() {
    clearSession();
    setSession("");
  }

  function handleGoogleLogin() {
    if (!GOOGLE_AUTH_URL) {
      setAuthError("Google login chưa được cấu hình.");
      return;
    }

    window.location.assign(GOOGLE_AUTH_URL);
  }

  function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGameName.trim();
    if (!name) return;

    const game = createGame(name);
    persistGames([game, ...games]);
    setSelectedGameId(game.id);
    setNewGameName("");
    setExpenseForm(emptyExpenseForm);
  }

  function handleAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = participantForm.name.trim();
    if (!selectedGame || !name) return;

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
  }

  function handleRemoveParticipant(participantId: string) {
    updateSelectedGame((game) => ({
      ...game,
      participants: game.participants.filter((participant) => participant.id !== participantId),
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
  }

  function handleToggleSplit(participantId: string) {
    setExpenseForm((current) => {
      const isSelected = current.splitParticipantIds.includes(participantId);
      return {
        ...current,
        splitParticipantIds: isSelected
          ? current.splitParticipantIds.filter((id) => id !== participantId)
          : [...current.splitParticipantIds, participantId],
      };
    });
  }

  function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGame) return;

    const participantIds = new Set(selectedGame.participants.map((participant) => participant.id));
    const payerId = expenseForm.payerId || selectedGame.participants[0]?.id || "";
    const splitParticipantIds = expenseForm.splitParticipantIds.filter((id) => participantIds.has(id));
    const amount = parseMoney(expenseForm.amount);
    const categoryId = normalizeExpenseCategoryId(expenseForm.categoryId);

    if (!payerId || amount <= 0 || splitParticipantIds.length === 0) return;

    const expense: Expense = {
      id: createId("expense"),
      title: expenseForm.title.trim() || "Khoản chi",
      amount,
      categoryId,
      payerId,
      splitParticipantIds,
      createdAt: new Date().toISOString(),
    };

    updateSelectedGame((game) => ({
      ...game,
      expenses: [expense, ...game.expenses],
    }));
    setExpenseForm({
      ...emptyExpenseForm,
      payerId,
      splitParticipantIds,
    });
  }

  function handleRemoveExpense(expenseId: string) {
    updateSelectedGame((game) => ({
      ...game,
      expenses: game.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  async function handleCopyShareLink() {
    if (!selectedGame) return;

    const shareUrl = `${window.location.origin}/share/${selectedGame.shareToken}?data=${encodeShareGame(
      selectedGame,
    )}`;
    await navigator.clipboard?.writeText(shareUrl);
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1600);
  }

  if (isShareMode) {
    const shareData = searchParams.get("data");
    const sharedGame =
      (shareData ? decodeShareGame(shareData) : null) ||
      games.find((game) => game.shareToken === shareToken);

    return (
      <PageShell>
        {sharedGame ? (
          <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-5">
            <GameDashboard game={sharedGame} readOnly />
          </main>
        ) : (
          <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-5">
            <EmptyState title="Không tìm thấy link chia sẻ" description="Link này không có dữ liệu bản chụp." />
          </main>
        )}
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6 sm:px-5">
          <form
            onSubmit={handleLogin}
            className="w-full rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Chia kèo</p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950">Đăng nhập cục bộ</h1>
              <p className="mt-2 text-sm text-stone-600">
                Nhập tên đăng nhập và mật khẩu để quản lý trên máy này.
              </p>
            </div>
            <label className="block text-sm font-medium text-stone-700" htmlFor="username">
              Tên đăng nhập
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
              placeholder="huy"
            />
            <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="password">
              Mật khẩu
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
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />
            {authError && <p className="mt-3 text-sm font-medium text-red-600">{authError}</p>}
            <button
              type="submit"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <WalletCards size={18} />
              Đăng nhập
            </button>
            <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-stone-400">
              <span className="h-px flex-1 bg-stone-200" />
              Hoặc
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
              Tiếp tục với Google
            </button>
          </form>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-stone-950">Chia kèo</h1>
            <p className="text-sm text-stone-600">Tính tiền nhóm và sinh QR nhận tiền.</p>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <span className="hidden text-sm text-stone-600 sm:inline">{session}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <LogOut size={16} />
              Thoát
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 md:sticky md:top-5 md:self-start">
          <form onSubmit={handleCreateGame} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium text-stone-700" htmlFor="game-name">
              Tạo cuộc chơi
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="game-name"
                value={newGameName}
                onChange={(event) => setNewGameName(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Đà Nẵng 2026"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
                aria-label="Tạo cuộc chơi"
              >
                <Plus size={18} />
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800">
              <ReceiptText size={17} />
              Cuộc chơi
            </div>
            {games.length > 0 ? (
              <div className="flex snap-x gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
                {games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setCopiedShare(false);
                    }}
                    className={`w-56 shrink-0 snap-start rounded-md border px-3 py-3 text-left transition md:w-full ${
                      selectedGame?.id === game.id
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-stone-950">{game.name}</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {game.participants.length} người, {game.expenses.length} khoản
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-4 text-sm text-stone-500">Chưa có cuộc chơi nào.</p>
            )}
          </section>
        </aside>

        <section>
          {selectedGame ? (
            <>
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-700">{selectedGame.code}</p>
                  <h2 className="truncate text-2xl font-semibold text-stone-950">{selectedGame.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:w-auto"
                >
                  {copiedShare ? <Copy size={16} /> : <Link size={16} />}
                  {copiedShare ? "Đã sao chép" : "Sao chép link chia sẻ"}
                </button>
              </div>

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  <ParticipantPanel
                    game={selectedGame}
                    form={participantForm}
                    onChange={setParticipantForm}
                    onSubmit={handleAddParticipant}
                    onRemove={handleRemoveParticipant}
                  />
                  <PaymentProfilePanel game={selectedGame} onUpdate={updateSelectedGame} />
                  <ExpensePanel
                    game={selectedGame}
                    form={expenseForm}
                    onChange={setExpenseForm}
                    onToggleSplit={handleToggleSplit}
                    onSubmit={handleAddExpense}
                    onRemove={handleRemoveExpense}
                  />
                </div>
                <GameDashboard game={selectedGame} />
              </div>
            </>
          ) : (
            <EmptyState title="Bắt đầu một cuộc chơi" description="Tạo cuộc chơi đầu tiên để thêm người và khoản chi." />
          )}
        </section>
      </main>
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-stone-100 text-stone-950">{children}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
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
        <h3 className="text-lg font-semibold text-stone-950">Người tham gia</h3>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Tên">
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value, avatarSeed: "" })}
            className="field"
            placeholder="Huy"
          />
        </Field>
        <div className="sm:self-end">
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:h-10 sm:w-auto"
          >
            <Plus size={17} />
            Thêm người
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
                    src={buildAvatarDataUri(avatarSeed, `Avatar của ${participant.name}`)}
                    alt={`Avatar của ${participant.name}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{participant.name}</p>
                    <p className="mt-1 truncate text-xs text-stone-500">Người tham gia</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(participant.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                  aria-label={`Xóa ${participant.name}`}
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
      <p className="mb-2 text-sm font-medium text-stone-700">Gợi ý avatar</p>
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
              aria-label={`Chọn avatar ${index + 1}`}
            >
              <img
                className="h-full w-full rounded-full"
                src={buildAvatarDataUri(avatarSeed, `Avatar gợi ý ${index + 1}`)}
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
  onUpdate: (updater: (game: Game) => Game) => void;
}) {
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };

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
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <WalletCards size={18} className="text-emerald-700" />
        <h3 className="text-lg font-semibold text-stone-950">Tài khoản chủ cuộc chơi</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Mã ngân hàng">
          <input
            value={paymentProfile.bankId}
            onChange={(event) => updatePaymentProfile({ bankId: event.target.value })}
            className="field"
            placeholder="VCB, TCB, MBB..."
          />
        </Field>
        <Field label="Số tài khoản">
          <input
            value={paymentProfile.accountNo}
            onChange={(event) => updatePaymentProfile({ accountNo: event.target.value })}
            className="field"
            placeholder="0123456789"
          />
        </Field>
        <Field label="Tên chủ tài khoản">
          <input
            value={paymentProfile.accountName}
            onChange={(event) => updatePaymentProfile({ accountName: event.target.value })}
            className="field"
            placeholder="NGUYEN VAN A"
          />
        </Field>
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
}: {
  game: Game;
  form: ExpenseForm;
  onChange: (form: ExpenseForm) => void;
  onToggleSplit: (participantId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (expenseId: string) => void;
}) {
  const payerId = form.payerId || game.participants[0]?.id || "";

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
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-blue-700" />
        <h3 className="text-lg font-semibold text-stone-950">Khoản chi</h3>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-stone-700">Gợi ý nhanh</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {EXPENSE_SUGGESTIONS.map((suggestion) => (
            <button
              key={`${suggestion.categoryId}-${suggestion.title}`}
              type="button"
              onClick={() => handleApplySuggestion(suggestion)}
              disabled={game.participants.length === 0}
              className="min-w-0 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block truncate text-sm font-semibold text-stone-950">{suggestion.title}</span>
              <span className="mt-1 block text-xs text-stone-500">
                {getExpenseCategoryLabel(suggestion.categoryId)} - {formatMoney(suggestion.amount)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Nội dung">
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder="Ăn tối"
          />
        </Field>
        <Field label="Số tiền">
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: formatMoneyInput(event.target.value) })}
            className="field"
            inputMode="numeric"
            placeholder={formatMoney(AMOUNT_PLACEHOLDER_VALUE)}
          />
        </Field>
        <Field label="Phân loại">
          <div role="radiogroup" aria-label="Phân loại" className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={form.categoryId === category.id}
                onClick={() => onChange({ ...form, categoryId: normalizeExpenseCategoryId(category.id) })}
                className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                  form.categoryId === category.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Người trả">
          <AppSelect
            value={payerId}
            onValueChange={(value) => onChange({ ...form, payerId: value })}
            options={game.participants.map((participant) => ({
              value: participant.id,
              label: participant.name,
            }))}
            placeholder="Chưa có người"
            disabled={game.participants.length === 0}
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Chia cho ai</p>
          <div className="flex flex-wrap gap-2">
            {game.participants.map((participant) => {
              const checked = form.splitParticipantIds.includes(participant.id);
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => onToggleSplit(participant.id)}
                  className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={game.participants.length === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300 sm:h-10 sm:w-auto"
          >
            <Plus size={17} />
            Thêm khoản chi
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {game.expenses.map((expense) => {
          const payer = game.participants.find((participant) => participant.id === expense.payerId);
          const categoryLabel = getExpenseCategoryLabel(expense.categoryId);
          return (
            <div key={expense.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-stone-950">{expense.title}</p>
                    <CategoryPill label={categoryLabel} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {payer?.name || "Không rõ"} trả, chia {expense.splitParticipantIds.length} người
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label={`Xóa ${expense.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GameDashboard({ game, readOnly = false }: { game: Game; readOnly?: boolean }) {
  const balances = calculateBalances(game);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
  const paymentProfile = { ...emptyPaymentProfile, ...game.paymentProfile };
  const payers = balances.filter((row) => row.balance < 0);
  const hasOwnerQr = canBuildVietQr(paymentProfile);

  return (
    <aside className="space-y-4 sm:space-y-5">
      {readOnly && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{game.name}</h1>
        </section>
      )}

      <PatternSummaryCard game={game} totalExpense={totalExpense} />

      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Metric label="Tổng chi" value={formatMoney(totalExpense)} />
        <Metric label="Số người" value={String(game.participants.length)} />
        <Metric label="Khoản chi" value={String(game.expenses.length)} />
      </section>

      <CategorySummaryCard summaries={categorySummaries} />

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Cân bằng</h3>
        <div className="mt-4 space-y-3">
          {balances.length > 0 ? (
            balances.map((row) => (
              <div key={row.participant.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                  <p className="min-w-0 truncate text-sm font-semibold text-stone-950">{row.participant.name}</p>
                  <BalancePill value={row.balance} />
                </div>
                <div className="mt-3 grid gap-1 text-xs text-stone-500 min-[420px]:grid-cols-2 min-[420px]:gap-2">
                  <span>Đã trả: {formatMoney(row.paid)}</span>
                  <span>Phải chịu: {formatMoney(row.owed)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">Chưa có người tham gia.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Chuyển tiền cho chủ cuộc chơi</h3>
        <div className="mt-4 space-y-3">
          {payers.length > 0 ? (
            payers.map((row) => {
              const amount = Math.abs(row.balance);

              return (
                <div key={`${row.participant.id}-${amount}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-950">{row.participant.name} cần trả</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(amount)}</p>
                    </div>
                  </div>
                  {hasOwnerQr ? (
                    <img
                      className="mt-3 w-full rounded-md border border-stone-200"
                      src={buildVietQrUrl(paymentProfile, amount, game.code)}
                      alt="QR nhận tiền của chủ cuộc chơi"
                    />
                  ) : (
                    <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-500">
                      Chủ cuộc chơi chưa nhập mã ngân hàng và số tài khoản.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">
              {readOnly ? "Không có khoản cần chuyển." : "Thêm khoản chi để tính tiền."}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function CategorySummaryCard({ summaries }: { summaries: ExpenseCategorySummary[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-950">Theo phân loại</h3>
      <div className="mt-4 space-y-2">
        {summaries.length > 0 ? (
          summaries.map((summary) => (
            <div
              key={summary.categoryId}
              className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950">{summary.label}</p>
                <p className="mt-1 text-xs text-stone-500">{summary.count} khoản</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-stone-950">{formatMoney(summary.total)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">Chưa có khoản chi.</p>
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
        <p className="text-xs font-semibold uppercase text-stone-500">Tổng đã chi</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="min-w-0 truncate text-2xl font-semibold text-stone-950">{formatMoney(totalExpense)}</span>
          <span className="shrink-0 text-sm font-medium text-stone-500">{getGameAgeLabel(game.createdAt)}</span>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
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
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger className="select-trigger" aria-label={placeholder}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="text-stone-500">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
      {label}
    </span>
  );
}

function BalancePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        Nhận {formatMoney(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        Trả {formatMoney(Math.abs(value))}
      </span>
    );
  }

  return <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">Đủ</span>;
}

export default App;
