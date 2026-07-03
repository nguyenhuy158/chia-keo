import {
  Banknote,
  Copy,
  Link,
  LogOut,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { formatMoney, parseMoney } from "./lib/money";
import { calculateBalances, calculateSettlements } from "./lib/split";
import { clearSession, loadGames, loadSession, saveGames, saveSession } from "./lib/storage";
import { buildVietQrUrl, canBuildVietQr } from "./lib/vietqr";
import type { Expense, Game, Participant } from "./types";

type ParticipantForm = Pick<Participant, "name" | "bankId" | "accountNo" | "accountName">;

type ExpenseForm = {
  title: string;
  amount: string;
  payerId: string;
  splitParticipantIds: string[];
};

const emptyParticipantForm: ParticipantForm = {
  name: "",
  bankId: "",
  accountNo: "",
  accountName: "",
};

const emptyExpenseForm: ExpenseForm = {
  title: "",
  amount: "",
  payerId: "",
  splitParticipantIds: [],
};

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

function getShareTokenFromPath() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)/);
  return match?.[1] || "";
}

function createGame(name: string): Game {
  return {
    id: createId("game"),
    code: createGameCode(),
    name,
    participants: [],
    expenses: [],
    shareToken: createId("share").replace("share_", ""),
    createdAt: new Date().toISOString(),
  };
}

function App() {
  const [games, setGames] = useState<Game[]>(() => loadGames());
  const [session, setSession] = useState(() => loadSession());
  const [loginName, setLoginName] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(() => loadGames()[0]?.id || "");
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(emptyParticipantForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [copiedShare, setCopiedShare] = useState(false);

  const shareToken = useMemo(() => getShareTokenFromPath(), []);
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

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = loginName.trim();
    if (!username) return;

    saveSession(username);
    setSession(username);
  }

  function handleLogout() {
    clearSession();
    setSession("");
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
      bankId: participantForm.bankId.trim(),
      accountNo: participantForm.accountNo.trim(),
      accountName: participantForm.accountName.trim(),
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

    if (!payerId || amount <= 0 || splitParticipantIds.length === 0) return;

    const expense: Expense = {
      id: createId("expense"),
      title: expenseForm.title.trim() || "Khoan chi",
      amount,
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

    const shareUrl = `${window.location.origin}/share/${selectedGame.shareToken}`;
    await navigator.clipboard?.writeText(shareUrl);
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1600);
  }

  if (isShareMode) {
    const sharedGame = games.find((game) => game.shareToken === shareToken);

    return (
      <PageShell>
        {sharedGame ? (
          <GameDashboard game={sharedGame} readOnly />
        ) : (
          <EmptyState title="Khong tim thay link chia se" description="Link nay khong co trong du lieu local." />
        )}
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
          <form
            onSubmit={handleLogin}
            className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Chia keo</p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950">Dang nhap local</h1>
              <p className="mt-2 text-sm text-stone-600">Nhap ten de quan ly cac cuoc choi tren may nay.</p>
            </div>
            <label className="block text-sm font-medium text-stone-700" htmlFor="username">
              Ten cua ban
            </label>
            <input
              id="username"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Vi du: Huy"
            />
            <button
              type="submit"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <WalletCards size={18} />
              Vao app
            </button>
          </form>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-950">Chia keo</h1>
            <p className="text-sm text-stone-600">Tinh tien nhom va sinh QR nhan tien.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-600 sm:inline">{session}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <LogOut size={16} />
              Thoat
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <form onSubmit={handleCreateGame} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium text-stone-700" htmlFor="game-name">
              Tao cuoc choi
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="game-name"
                value={newGameName}
                onChange={(event) => setNewGameName(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Da Nang 2026"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
                aria-label="Tao cuoc choi"
              >
                <Plus size={18} />
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-stone-800">
              <ReceiptText size={17} />
              Cuoc choi
            </div>
            {games.length > 0 ? (
              <div className="space-y-2">
                {games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setCopiedShare(false);
                    }}
                    className={`w-full rounded-md border px-3 py-3 text-left transition ${
                      selectedGame?.id === game.id
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-stone-950">{game.name}</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {game.participants.length} nguoi, {game.expenses.length} khoan
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-4 text-sm text-stone-500">Chua co cuoc choi nao.</p>
            )}
          </section>
        </aside>

        <section>
          {selectedGame ? (
            <>
              <div className="mb-5 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">{selectedGame.code}</p>
                  <h2 className="text-2xl font-semibold text-stone-950">{selectedGame.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  {copiedShare ? <Copy size={16} /> : <Link size={16} />}
                  {copiedShare ? "Da copy" : "Copy link share"}
                </button>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  <ParticipantPanel
                    game={selectedGame}
                    form={participantForm}
                    onChange={setParticipantForm}
                    onSubmit={handleAddParticipant}
                    onRemove={handleRemoveParticipant}
                  />
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
            <EmptyState title="Bat dau mot cuoc choi" description="Tao cuoc choi dau tien de them nguoi va khoan chi." />
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
        <h3 className="text-lg font-semibold text-stone-950">Nguoi tham gia</h3>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Ten">
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            className="field"
            placeholder="Huy"
          />
        </Field>
        <Field label="Ma ngan hang">
          <input
            value={form.bankId}
            onChange={(event) => onChange({ ...form, bankId: event.target.value })}
            className="field"
            placeholder="VCB, TCB, MBB..."
          />
        </Field>
        <Field label="So tai khoan">
          <input
            value={form.accountNo}
            onChange={(event) => onChange({ ...form, accountNo: event.target.value })}
            className="field"
            placeholder="0123456789"
          />
        </Field>
        <Field label="Ten chu tai khoan">
          <input
            value={form.accountName}
            onChange={(event) => onChange({ ...form, accountName: event.target.value })}
            className="field"
            placeholder="NGUYEN VAN A"
          />
        </Field>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Plus size={17} />
            Them nguoi
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {game.participants.map((participant) => (
          <div key={participant.id} className="rounded-md border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950">{participant.name}</p>
                <p className="mt-1 truncate text-xs text-stone-500">
                  {participant.bankId && participant.accountNo
                    ? `${participant.bankId} - ${participant.accountNo}`
                    : "Chua co thong tin QR"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(participant.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                aria-label={`Xoa ${participant.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
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

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-blue-700" />
        <h3 className="text-lg font-semibold text-stone-950">Khoan chi</h3>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Noi dung">
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder="An toi"
          />
        </Field>
        <Field label="So tien">
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: event.target.value })}
            className="field"
            inputMode="numeric"
            placeholder="500000"
          />
        </Field>
        <Field label="Nguoi tra">
          <select
            value={payerId}
            onChange={(event) => onChange({ ...form, payerId: event.target.value })}
            className="field"
          >
            {game.participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
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
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Plus size={17} />
            Them khoan chi
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {game.expenses.map((expense) => {
          const payer = game.participants.find((participant) => participant.id === expense.payerId);
          return (
            <div key={expense.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{expense.title}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {payer?.name || "Khong ro"} tra, chia {expense.splitParticipantIds.length} nguoi
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label={`Xoa ${expense.title}`}
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
  const settlements = calculateSettlements(balances);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);

  return (
    <aside className="space-y-5">
      {readOnly && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{game.name}</h1>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Metric label="Tong chi" value={formatMoney(totalExpense)} />
        <Metric label="So nguoi" value={String(game.participants.length)} />
        <Metric label="Khoan chi" value={String(game.expenses.length)} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Can bang</h3>
        <div className="mt-4 space-y-3">
          {balances.length > 0 ? (
            balances.map((row) => (
              <div key={row.participant.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-stone-950">{row.participant.name}</p>
                  <BalancePill value={row.balance} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500">
                  <span>Da tra: {formatMoney(row.paid)}</span>
                  <span>Phai chiu: {formatMoney(row.owed)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">Chua co nguoi tham gia.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Chuyen khoan toi uu</h3>
        <div className="mt-4 space-y-3">
          {settlements.length > 0 ? (
            settlements.map((settlement) => (
              <div
                key={`${settlement.from.id}-${settlement.to.id}-${settlement.amount}`}
                className="rounded-md border border-stone-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-950">
                      {settlement.from.name} tra {settlement.to.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(settlement.amount)}</p>
                  </div>
                </div>
                {canBuildVietQr(settlement.to) && (
                  <img
                    className="mt-3 w-full rounded-md border border-stone-200"
                    src={buildVietQrUrl(settlement.to, settlement.amount, game.code)}
                    alt={`QR nhan tien cua ${settlement.to.name}`}
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">
              {readOnly ? "Khong co khoan can chuyen." : "Them khoan chi de tinh tien."}
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
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

function BalancePill({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        Nhan {formatMoney(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        Tra {formatMoney(Math.abs(value))}
      </span>
    );
  }

  return <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">Du</span>;
}

export default App;
