import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Equal,
  Landmark,
  Link,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  ReceiptText,
  Settings,
  Tags,
  Trash2,
  UserRoundCheck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
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
  fetchRemoteGames,
  fetchShareSnapshot,
  loginOrCreateRemoteUser,
  logoutRemoteUser,
  saveRemoteGame,
} from "./adapters/browser/remote-api";
import {
  VIETQR_BANK_OPTIONS,
  buildVietQrUrl,
  canBuildVietQr,
  getVietQrPaymentIssue,
  resolveVietQrBankId,
} from "./adapters/browser/vietqr";
import { decodeShareGame, encodeShareGame } from "./core/application/share-game";
import {
  EXPENSE_CATEGORIES,
  getExpenseCategoryLabel,
  normalizeExpenseCategoryId,
} from "./core/domain/expense-categories";
import { formatMoney, formatMoneyInput, parseMoney } from "./core/domain/money";
import { toParticipantTitleCase } from "./core/domain/participant-name";
import { calculateBalances, calculateReceiptTotals, getRemainingPayable } from "./core/domain/split";
import type { Expense, ExpenseCategoryId, Game, Participant, PaymentProfile, Receipt } from "./core/domain/types";
import {
  clearSession,
  loadGames,
  loadProfileName,
  loadSession,
  loadSessionToken,
  saveGames,
  saveProfileName,
  saveSession,
} from "./adapters/browser/local-storage";
import {
  AMOUNT_PLACEHOLDER_VALUE,
  CREATE_REMOTE_GAME_TOAST_ID,
  DAYS_PER_MONTH,
  DEFAULT_TOAST_DURATION_MS,
  DEFAULT_WORKSPACE_TAB,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_SUGGESTIONS,
  GOOGLE_AUTH_URL,
  MILLISECONDS_PER_DAY,
  MOBILE_VISIBLE_BALANCE_LIMIT,
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

type ExpenseCategorySummary = {
  categoryId: ExpenseCategoryId;
  label: string;
  total: number;
  count: number;
};

type SelectOption = {
  value: string;
  label: string;
};

type GameUpdateOptions = {
  onSaved?: () => void;
};

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

function createGame(name: string): Game {
  return {
    id: createId("game"),
    code: createGameCode(),
    name,
    paymentProfile: { ...emptyPaymentProfile },
    participants: [],
    expenses: [],
    receipts: [],
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

function getParticipantName(game: Game | undefined, participantId: string) {
  return game?.participants.find((participant) => participant.id === participantId)?.name || "Không rõ";
}

function createExpenseForm(expense: Expense): ExpenseForm {
  return {
    title: expense.title,
    amount: formatMoney(expense.amount),
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
  const [games, setGames] = useState<Game[]>(() => loadGames());
  const [session, setSession] = useState(() => loadSession());
  const [sessionToken, setSessionToken] = useState(() => loadSessionToken());
  const [profileDisplayName, setProfileDisplayName] = useState(() => {
    const username = loadSession();

    return username ? loadProfileName(username) : "";
  });
  const [profileNameDraft, setProfileNameDraft] = useState(profileDisplayName);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [dataError, setDataError] = useState("");
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(() => loadGames()[0]?.id || "");
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(emptyParticipantForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTabId>(DEFAULT_WORKSPACE_TAB);
  const [copiedShare, setCopiedShare] = useState(false);
  const [remoteSharedGame, setRemoteSharedGame] = useState<Game | null>(null);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const { shareToken = "" } = useParams();
  const [searchParams] = useSearchParams();

  const isShareMode = Boolean(shareToken);
  const selectedGame =
    games.find((game) => game.id === selectedGameId) ||
    games.find((game) => game.shareToken === shareToken) ||
    games[0];
  const accountDisplayName = profileDisplayName || session;

  useEffect(() => {
    if (!sessionToken || isShareMode) return;

    let ignore = false;
    setIsLoadingGames(true);
    setDataError("");

    fetchRemoteGames(sessionToken)
      .then((remoteGames) => {
        if (ignore) return;

        setGames(remoteGames);
        saveGames(remoteGames);
        setSelectedGameId((current) => current || remoteGames[0]?.id || "");
        toast.success("Đã đồng bộ dữ liệu", {
          id: REMOTE_SYNC_TOAST_ID,
          description: `${remoteGames.length} cuộc chơi đã được tải.`,
          duration: 1600,
        });
      })
      .catch((error: Error) => {
        if (!ignore) {
          setDataError(error.message);
          toast.error(error.message, { id: REMOTE_SYNC_TOAST_ID, duration: 2600 });
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingGames(false);
      });

    return () => {
      ignore = true;
    };
  }, [isShareMode, sessionToken]);

  useEffect(() => {
    if (!isShareMode) return;

    const shareData = searchParams.get("data");
    const decodedGame = shareData ? decodeShareGame(shareData) : null;
    if (decodedGame) {
      setRemoteSharedGame(decodedGame);
      setIsLoadingShare(false);
      return;
    }

    let ignore = false;
    setIsLoadingShare(true);
    fetchShareSnapshot(shareToken)
      .then((game) => {
        if (!ignore) {
          setRemoteSharedGame(game);
          if (game) showSuccessToast("Đã tải link chia sẻ");
        }
      })
      .catch(() => {
        if (!ignore) {
          setRemoteSharedGame(null);
          showErrorToast("Không tải được link chia sẻ");
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
    saveGames(nextGames);
  }

  async function persistRemoteGame(game: Game) {
    if (!sessionToken) return true;

    try {
      await saveRemoteGame(sessionToken, game);
      setDataError("");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không lưu được dữ liệu.";

      setDataError(message);
      toast.error(message, { id: REMOTE_SAVE_ERROR_TOAST_ID, duration: 2600 });
      return false;
    }
  }

  function updateSelectedGame(updater: (game: Game) => Game, options?: GameUpdateOptions) {
    if (!selectedGame) return;

    const nextGame = updater(selectedGame);
    persistGames(games.map((game) => (game.id === selectedGame.id ? nextGame : game)));
    void persistRemoteGame(nextGame).then((saved) => {
      if (saved) options?.onSaved?.();
    });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = loginName.trim();
    const password = loginPassword.trim();

    try {
      const result = await loginOrCreateRemoteUser(username, password);
      const loggedInUsername = result.session.username || username;
      const displayName = loadProfileName(loggedInUsername);

      saveSession(loggedInUsername, result.session.token);
      saveGames(result.games);
      setGames(result.games);
      setSession(loggedInUsername);
      setSessionToken(result.session.token);
      setSelectedGameId(result.games[0]?.id || "");
      setProfileDisplayName(displayName);
      setProfileNameDraft(displayName);
      setAuthError("");
      setLoginPassword("");
      showSuccessToast("Đăng nhập thành công", `Xin chào ${displayName || loggedInUsername}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại.";

      setAuthError(message);
      showErrorToast(message);
      return;
    }
  }

  function handleLogout() {
    if (sessionToken) {
      void logoutRemoteUser(sessionToken).catch(() => undefined);
    }
    clearSession();
    setSession("");
    setSessionToken("");
    setGames([]);
    setSelectedGameId("");
    setProfileDisplayName("");
    setProfileNameDraft("");
    setProfileSettingsOpen(false);
    showInfoToast("Đã đăng xuất");
  }

  function handleOpenProfileSettings() {
    setProfileNameDraft(profileDisplayName || session);
    setProfileSettingsOpen((current) => !current);
    showInfoToast(profileSettingsOpen ? "Đã đóng cài đặt tài khoản" : "Đã mở cài đặt tài khoản");
  }

  function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = profileNameDraft.trim() || session;

    saveProfileName(session, displayName);
    setProfileDisplayName(displayName);
    setProfileNameDraft(displayName);
    setProfileSettingsOpen(false);
    toast.success("Đã lưu tên hiển thị", { duration: 1600 });
  }

  function handleGoogleLogin() {
    if (!GOOGLE_AUTH_URL) {
      const message = "Google login chưa được cấu hình.";

      setAuthError(message);
      showErrorToast(message);
      return;
    }

    showInfoToast("Đang chuyển sang Google");
    window.location.assign(GOOGLE_AUTH_URL);
  }

  function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGameName.trim();
    if (!name) {
      showErrorToast("Nhập tên cuộc chơi trước");
      return;
    }

    const game = createGame(name);
    persistGames([game, ...games]);
    setSelectedGameId(game.id);
    setNewGameName("");
    setExpenseForm(emptyExpenseForm);
    setEditingExpenseId("");
    setActiveWorkspaceTab(DEFAULT_WORKSPACE_TAB);
    showSuccessToast("Đã tạo cuộc chơi", game.name);
    if (sessionToken) {
      createRemoteGame(sessionToken, game)
        .then(() => {
          setDataError("");
          toast.success("Đã đồng bộ cuộc chơi", { id: CREATE_REMOTE_GAME_TOAST_ID, duration: 1600 });
        })
        .catch((error: Error) => {
          setDataError(error.message);
          toast.error(error.message, { id: CREATE_REMOTE_GAME_TOAST_ID, duration: 2600 });
        });
    }
  }

  function handleSelectGame(gameId: string) {
    const nextGame = games.find((game) => game.id === gameId);

    setSelectedGameId(gameId);
    setCopiedShare(false);
    setEditingExpenseId("");
    setExpenseForm(emptyExpenseForm);
    if (nextGame) showInfoToast("Đã chọn cuộc chơi", nextGame.name);
  }

  function handleAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = toParticipantTitleCase(participantForm.name);
    if (!selectedGame) {
      showErrorToast("Chưa chọn cuộc chơi");
      return;
    }

    if (!name) {
      showErrorToast("Nhập tên người tham gia trước");
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
    showSuccessToast("Đã thêm người tham gia", participant.name);
  }

  function handleRemoveParticipant(participantId: string) {
    const participantName =
      selectedGame?.participants.find((participant) => participant.id === participantId)?.name || "Người tham gia";

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
    showInfoToast("Đã xóa người tham gia", participantName);
  }

  function handleToggleSplit(participantId: string) {
    const participantName =
      selectedGame?.participants.find((participant) => participant.id === participantId)?.name || "Người này";
    const isSelected = expenseForm.splitParticipantIds.includes(participantId);

    showInfoToast(
      isSelected ? "Đã bỏ khỏi danh sách chia" : "Đã thêm vào danh sách chia",
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
      showErrorToast("Chưa chọn cuộc chơi");
      return;
    }

    const participantIds = new Set(selectedGame.participants.map((participant) => participant.id));
    const payerId = expenseForm.payerId || selectedGame.participants[0]?.id || "";
    const splitParticipantIds = expenseForm.splitParticipantIds.filter((id) => participantIds.has(id));
    const amount = parseMoney(expenseForm.amount);
    const categoryId = normalizeExpenseCategoryId(expenseForm.categoryId);

    if (!payerId) {
      showErrorToast("Chọn người trả trước");
      return;
    }

    if (amount <= 0) {
      showErrorToast("Nhập số tiền lớn hơn 0");
      return;
    }

    if (splitParticipantIds.length === 0) {
      showErrorToast("Chọn ít nhất một người để chia");
      return;
    }

    const existingExpense = selectedGame.expenses.find((expense) => expense.id === editingExpenseId);
    const expense: Expense = {
      id: existingExpense?.id || createId("expense"),
      title: expenseForm.title.trim() || "Khoản chi",
      amount,
      categoryId,
      payerId,
      splitParticipantIds,
      createdAt: existingExpense?.createdAt || new Date().toISOString(),
    };

    updateSelectedGame((game) => ({
      ...game,
      expenses: existingExpense
        ? game.expenses.map((item) => (item.id === existingExpense.id ? expense : item))
        : [expense, ...game.expenses],
    }));
    setExpenseForm({
      ...emptyExpenseForm,
      payerId,
      splitParticipantIds,
    });
    setEditingExpenseId("");
    showSuccessToast(
      existingExpense ? "Đã cập nhật khoản chi" : "Đã thêm khoản chi",
      `${expense.title} - ${formatMoney(expense.amount)}`,
    );
  }

  function handleEditExpense(expenseId: string) {
    const expense = selectedGame?.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      showErrorToast("Không tìm thấy khoản chi");
      return;
    }

    setEditingExpenseId(expense.id);
    setExpenseForm(createExpenseForm(expense));
    setActiveWorkspaceTab("expenses");
    showInfoToast("Đang sửa khoản chi", expense.title);
    window.setTimeout(() => {
      const expenseTitleInput = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-expense-title-input]"),
      ).find((input) => input.offsetParent !== null);

      expenseTitleInput?.focus();
    }, 0);
  }

  function handleCancelEditExpense() {
    setEditingExpenseId("");
    setExpenseForm(emptyExpenseForm);
    showInfoToast("Đã hủy sửa khoản chi");
  }

  function handleRemoveExpense(expenseId: string) {
    const expenseTitle = selectedGame?.expenses.find((expense) => expense.id === expenseId)?.title || "Khoản chi";

    updateSelectedGame((game) => ({
      ...game,
      expenses: game.expenses.filter((expense) => expense.id !== expenseId),
    }));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId("");
      setExpenseForm(emptyExpenseForm);
    }
    showInfoToast("Đã xóa khoản chi", expenseTitle);
  }

  function handleAddReceipt(participantId: string, amount: number) {
    if (!selectedGame) {
      showErrorToast("Chưa chọn cuộc chơi");
      return;
    }

    if (amount <= 0) {
      showErrorToast("Không còn khoản cần thu");
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
          showSuccessToast("Đã ghi nhận thu tiền", `${participantName} - ${formatMoney(amount)}`),
      },
    );
  }

  function handleRemoveReceipt(receiptId: string) {
    if (!selectedGame) return;

    const receipt = (selectedGame.receipts || []).find((item) => item.id === receiptId);
    const participantName = receipt ? getParticipantName(selectedGame, receipt.participantId) : "Khoản thu";

    updateSelectedGame(
      (game) => ({
        ...game,
        receipts: (game.receipts || []).filter((item) => item.id !== receiptId),
      }),
      {
        onSaved: () => showInfoToast("Đã xóa khoản thu", participantName),
      },
    );
  }

  async function handleCopyShareLink() {
    if (!selectedGame) {
      showErrorToast("Chưa chọn cuộc chơi để chia sẻ");
      return;
    }

    toast.loading("Đang tạo link chia sẻ", { id: SHARE_LINK_TOAST_ID });
    let shareUrl = `${window.location.origin}/share/${selectedGame.shareToken}?data=${encodeShareGame(selectedGame)}`;
    if (sessionToken) {
      try {
        const result = await createShareSnapshot(sessionToken, selectedGame);
        shareUrl = `${window.location.origin}${result.url}`;
        setDataError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không tạo được link chia sẻ.";
        setDataError(message);
        toast.error(message, { id: SHARE_LINK_TOAST_ID, duration: 2600 });
        return;
      }
    }

    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedShare(true);
      toast.success("Đã sao chép link chia sẻ", {
        id: SHARE_LINK_TOAST_ID,
        description: selectedGame.name,
        duration: DEFAULT_TOAST_DURATION_MS,
      });
      window.setTimeout(() => setCopiedShare(false), 1600);
    } catch {
      toast.error("Không sao chép được link", { id: SHARE_LINK_TOAST_ID, duration: 2600 });
    }
  }

  function handleOpenExpenseAction() {
    setActiveWorkspaceTab("expenses");
    showInfoToast("Đã mở form khoản chi");
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
          <main className="app-scroll-pane mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-5 sm:py-5">
            <EmptyState title="Đang tải link chia sẻ" description="Đang lấy dữ liệu từ Cloudflare KV." />
          </main>
        ) : sharedGame ? (
          <main className="app-scroll-pane mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-5 sm:py-5">
            <GameDashboard game={sharedGame} readOnly />
          </main>
        ) : (
          <main className="app-scroll-pane mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-5 sm:py-5">
            <EmptyState title="Không tìm thấy link chia sẻ" description="Link này không có dữ liệu bản chụp." />
          </main>
        )}
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 items-center px-4 py-6 sm:px-5">
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
              placeholder="Tên đăng nhập của bạn"
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
      />
    );
  }

  function renderSummaryPane(game: Game) {
    return <GameDashboard game={game} onAddReceipt={handleAddReceipt} onRemoveReceipt={handleRemoveReceipt} />;
  }

  function renderMobilePane(game: Game) {
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
        />
      );
    }

    if (activeWorkspaceTab === "summary") {
      return <MobileSummaryPane game={game} onAddReceipt={handleAddReceipt} />;
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight text-stone-950 sm:text-xl">Chia kèo</h1>
            <p className="hidden text-sm text-stone-600 sm:block">Tính tiền nhóm và sinh QR nhận tiền.</p>
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
              aria-label="Cài đặt tài khoản"
              aria-expanded={profileSettingsOpen}
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-stone-300 bg-white px-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:px-3"
              aria-label="Thoát"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Thoát</span>
            </button>
            {profileSettingsOpen && (
              <form
                onSubmit={handleSaveProfile}
                className="absolute right-0 top-12 z-30 w-full rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:w-80"
              >
                <Field label="Tên hiển thị" icon={UserRoundCheck}>
                  <input
                    value={profileNameDraft}
                    onChange={(event) => setProfileNameDraft(event.target.value)}
                    className="field"
                    placeholder="Tên hiển thị"
                  />
                </Field>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileSettingsOpen(false)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  >
                    <Check size={15} />
                    Lưu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-rows-[minmax(0,1fr)] gap-2 overflow-hidden px-2 py-2 md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1 md:gap-3 md:px-4 md:py-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="app-scroll-pane hidden min-w-0 space-y-2 md:block md:space-y-3">
          <form onSubmit={handleCreateGame} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
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

        <section className="min-h-0 min-w-0 overflow-hidden">
          {selectedGame ? (
            <div className="flex h-full min-h-0 flex-col gap-2 md:gap-3">
              <MobileGameControls
                game={selectedGame}
                games={games}
                newGameName={newGameName}
                copiedShare={copiedShare}
                dataError={dataError}
                isLoadingGames={isLoadingGames}
                onNewGameNameChange={setNewGameName}
                onCreateGame={handleCreateGame}
                onSelectGame={handleSelectGame}
                onCopyShareLink={handleCopyShareLink}
              />

              <div className="hidden shrink-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm md:flex">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-700">{selectedGame.code}</p>
                  <h2 className="truncate text-lg font-semibold leading-tight text-stone-950 sm:text-xl">
                    {selectedGame.name}
                  </h2>
                  {dataError && <p className="mt-1 text-sm font-medium text-red-600">{dataError}</p>}
                  {isLoadingGames && <p className="mt-1 text-sm text-stone-500">Đang đồng bộ D1...</p>}
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                  aria-label={copiedShare ? "Đã sao chép" : "Sao chép link chia sẻ"}
                >
                  {copiedShare ? <Copy size={16} /> : <Link size={16} />}
                  <span className="hidden sm:inline">{copiedShare ? "Đã sao chép" : "Sao chép link chia sẻ"}</span>
                  <span className="sm:hidden">{copiedShare ? "Xong" : "Link"}</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="mobile-one-screen h-full md:hidden">{renderMobilePane(selectedGame)}</div>

                <div className="app-scroll-pane hidden h-full pr-1 md:block xl:hidden">
                  {activeWorkspaceTab === "people" && renderPeoplePane(selectedGame)}
                  {activeWorkspaceTab === "expenses" && renderExpensePane(selectedGame)}
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
            <EmptyState title="Bắt đầu một cuộc chơi" description="Tạo cuộc chơi đầu tiên để thêm người và khoản chi." />
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

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex flex-col bg-stone-100 text-stone-950">
      <Toaster closeButton richColors position="bottom-right" />
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
  const sideTabs = WORKSPACE_TABS.filter((tab) => tab.id !== "expenses");
  const isExpenseActive = activeTab === "expenses";

  return (
    <nav className="workspace-bottom-bar shrink-0 border-t border-stone-200 bg-white px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-sm xl:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-[1fr_5rem_1fr] items-end gap-2">
        {sideTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition ${
                isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-50"
              } ${index === 1 ? "col-start-3" : ""}`}
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
          className={`workspace-fab absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-5 flex-col items-center justify-center rounded-full text-white shadow-sm transition ${
            isExpenseActive ? "ring-4 ring-emerald-100" : ""
          }`}
          aria-label="Thêm khoản chi"
          aria-current={isExpenseActive ? "page" : undefined}
        >
          <Plus size={23} aria-hidden="true" />
          <span className="mt-0.5 text-[0.68rem] font-bold leading-none">Chi</span>
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
  dataError,
  isLoadingGames,
  onNewGameNameChange,
  onCreateGame,
  onSelectGame,
  onCopyShareLink,
}: {
  game: Game;
  games: Game[];
  newGameName: string;
  copiedShare: boolean;
  dataError: string;
  isLoadingGames: boolean;
  onNewGameNameChange: (name: string) => void;
  onCreateGame: (event: FormEvent<HTMLFormElement>) => void;
  onSelectGame: (gameId: string) => void;
  onCopyShareLink: () => void;
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
          aria-label={copiedShare ? "Đã sao chép" : "Sao chép link chia sẻ"}
        >
          {copiedShare ? <Copy size={14} /> : <Link size={14} />}
          {copiedShare ? "Xong" : "Link"}
        </button>
      </div>

      {(dataError || isLoadingGames) && (
        <p className={`mt-1 truncate text-xs font-medium ${dataError ? "text-red-600" : "text-stone-500"}`}>
          {dataError || "Đang đồng bộ D1..."}
        </p>
      )}

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <AppSelect
          value={game.id}
          onValueChange={onSelectGame}
          options={games.map((item) => ({ value: item.id, label: item.name }))}
          placeholder="Chọn cuộc chơi"
          disabled={games.length === 0}
        />
        <form onSubmit={onCreateGame} className="flex min-w-0 gap-1">
          <input
            value={newGameName}
            onChange={(event) => onNewGameNameChange(event.target.value)}
            className="field min-w-0 flex-1"
            placeholder="Cuộc chơi mới"
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
            aria-label="Tạo cuộc chơi"
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
          Người
        </h3>
        <span className="text-xs font-semibold text-stone-500">{game.participants.length} người</span>
      </div>

      <form onSubmit={onSubmit} className="grid shrink-0 grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
        <input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value, avatarSeed: "" })}
          className="field"
          placeholder="Tên người tham gia"
        />
        <button
          type="submit"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800"
          aria-label="Thêm người"
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
              src={buildAvatarDataUri(getParticipantAvatarSeed(participant), `Avatar của ${participant.name}`)}
              alt=""
            />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-950">{participant.name}</span>
            <button
              type="button"
              onClick={() => onRemove(participant.id)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
              aria-label={`Xóa ${participant.name}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {hiddenParticipantCount > 0 && <MorePill count={hiddenParticipantCount} />}
      </div>

      <div className="min-h-0 rounded-md border border-stone-200 bg-stone-50 p-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-950">
          <WalletCards size={15} className="text-emerald-700" />
          Tài khoản nhận
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CompactField label="Ngân hàng" icon={Landmark} className="col-span-2">
            <BankSearchSelect
              value={selectedBankId}
              onValueChange={(bankId) => updatePaymentProfile({ bankId })}
              options={VIETQR_BANK_OPTIONS}
              placeholder="Chọn ngân hàng"
            />
          </CompactField>
          <CompactField label="Số TK" icon={CreditCard}>
            <input
              value={paymentProfile.accountNo}
              onChange={(event) => updatePaymentProfile({ accountNo: event.target.value })}
              className="field"
              placeholder="0123456789"
            />
          </CompactField>
          <CompactField label="Tên TK" icon={UserRoundCheck}>
            <input
              value={paymentProfile.accountName}
              onChange={(event) => updatePaymentProfile({ accountName: event.target.value })}
              className="field"
              placeholder="NGUYEN VAN A"
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
}) {
  const payerId = form.payerId || game.participants[0]?.id || "";
  const visibleExpenses = game.expenses.slice(0, MOBILE_VISIBLE_EXPENSE_LIMIT);
  const hiddenExpenseCount = Math.max(0, game.expenses.length - visibleExpenses.length);
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
    showInfoToast("Đã áp dụng gợi ý", suggestion.title);
  }

  return (
    <section className="mobile-panel">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
          <Banknote size={16} className="text-blue-700" />
          Khoản chi
        </h3>
        <span className="text-xs font-semibold text-stone-500">{game.expenses.length} khoản</span>
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
              className="flex min-w-0 flex-col items-center rounded-md border border-stone-200 bg-stone-50 px-1.5 py-1.5 text-center transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon size={15} className="text-emerald-700" aria-hidden="true" />
              <span className="mt-1 max-w-full truncate text-[0.68rem] font-semibold text-stone-950">
                {suggestion.title}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="grid shrink-0 grid-cols-2 gap-2">
        <CompactField label="Nội dung" icon={ReceiptText}>
          <input
            data-expense-title-input="true"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder="Ăn tối"
          />
        </CompactField>
        <CompactField label="Số tiền" icon={Banknote}>
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: formatMoneyInput(event.target.value) })}
            className="field"
            inputMode="numeric"
            placeholder={formatMoney(AMOUNT_PLACEHOLDER_VALUE)}
          />
        </CompactField>
        <CompactField label="Người trả" icon={WalletCards}>
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
        </CompactField>
        <CompactField label="Phân loại" icon={Tags}>
          <div role="radiogroup" aria-label="Phân loại" className="grid grid-cols-6 gap-1">
            {EXPENSE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-label={category.label}
                aria-checked={form.categoryId === category.id}
                onClick={() => onChange({ ...form, categoryId: normalizeExpenseCategoryId(category.id) })}
                className={`inline-flex h-9 items-center justify-center rounded-md border transition ${
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
            Chia cho ai
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
            {isEditing ? "Cập nhật khoản chi" : "Thêm khoản chi"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex h-9 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Hủy
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
                <p className="truncate text-[0.68rem] text-stone-500">{payer?.name || "Không rõ"} trả</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
              <button
                type="button"
                onClick={() => onEdit(expense.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50"
                aria-label={`Sửa ${expense.title}`}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(expense.id)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                aria-label={`Xóa ${expense.title}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        {hiddenExpenseCount > 0 && <MorePill count={hiddenExpenseCount} />}
      </div>
    </section>
  );
}

function MobileSummaryPane({
  game,
  onAddReceipt,
}: {
  game: Game;
  onAddReceipt?: (participantId: string, amount: number) => void;
}) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
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
  const firstPayer = payers[0];
  const firstPayerAmount = firstPayer?.remaining || 0;
  const visibleBalances = balances.slice(0, MOBILE_VISIBLE_BALANCE_LIMIT);
  const hiddenBalanceCount = Math.max(0, balances.length - visibleBalances.length);
  const topCategory = categorySummaries[0];
  const hasOwnerQr = canBuildVietQr(paymentProfile);
  const ownerQrIssue = getVietQrPaymentIssue(paymentProfile);

  return (
    <section className="mobile-panel">
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <MiniMetric label="Tổng" value={formatMoney(totalExpense)} icon={Banknote} />
        <MiniMetric label="Người" value={String(game.participants.length)} icon={Users} />
        <MiniMetric label="Khoản" value={String(game.expenses.length)} icon={ReceiptText} />
      </div>

      {topCategory && (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-stone-200 px-2 py-1.5">
          <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-stone-950">
            <ExpenseCategoryIcon categoryId={topCategory.categoryId} size={14} className="text-emerald-700" />
            <span className="truncate">{topCategory.label}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-stone-950">{formatMoney(topCategory.total)}</span>
        </div>
      )}

      <div className="min-h-0 space-y-1.5">
        {visibleBalances.length > 0 ? (
          visibleBalances.map((row) => (
            <div
              key={row.participant.id}
              className="flex items-center justify-between gap-2 rounded-md border border-stone-200 px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-stone-950">{row.participant.name}</span>
              <BalancePill value={row.balance} />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-stone-200 px-2 py-2 text-xs text-stone-500">Chưa có người tham gia.</p>
        )}
        {hiddenBalanceCount > 0 && <MorePill count={hiddenBalanceCount} />}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_7rem] gap-2 rounded-md border border-stone-200 bg-stone-50 p-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-950">
            <QrCode size={14} className="text-emerald-700" />
            QR nhận tiền
          </p>
          {firstPayer ? (
            <>
              <p className="mt-2 truncate text-sm font-semibold text-stone-950">
                {firstPayer.row.participant.name}
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(firstPayerAmount)}</p>
              {firstPayer.collected > 0 && (
                <p className="mt-1 text-[0.68rem] text-stone-500">Đã thu {formatMoney(firstPayer.collected)}</p>
              )}
              {onAddReceipt && (
                <button
                  type="button"
                  onClick={() => onAddReceipt(firstPayer.row.participant.id, firstPayerAmount)}
                  className="mt-2 inline-flex h-7 items-center justify-center rounded-md bg-emerald-700 px-2 text-[0.68rem] font-semibold text-white transition hover:bg-emerald-800"
                >
                  Đã thu
                </button>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-stone-500">Không có khoản cần chuyển.</p>
          )}
        </div>
        {firstPayer && hasOwnerQr ? (
          <img
            className="h-28 w-28 rounded-md border border-stone-200 bg-white object-contain"
            src={buildVietQrUrl(paymentProfile, firstPayerAmount, game.code)}
            alt="QR nhận tiền của chủ cuộc chơi"
          />
        ) : (
          <p className="flex h-28 w-28 items-center justify-center rounded-md bg-white px-2 text-center text-[0.68rem] text-stone-500">
            {firstPayer ? ownerQrIssue : "Chưa cần QR"}
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

function MorePill({ count }: { count: number }) {
  return (
    <span className="inline-flex h-7 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-2 text-xs font-semibold text-stone-500">
      +{count}
    </span>
  );
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
        <Field label="Tên" icon={UserRoundCheck}>
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value, avatarSeed: "" })}
            className="field"
            placeholder="Tên người tham gia"
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
                    <p className="break-words text-sm font-semibold leading-snug text-stone-950">
                      {participant.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">Người tham gia</p>
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
      toast.success("Đã tự lưu", {
        id: PAYMENT_PROFILE_SAVE_TOAST_ID,
        description: "Thông tin nhận tiền đã được cập nhật.",
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
        <h3 className="text-lg font-semibold text-stone-950">Tài khoản chủ cuộc chơi</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Ngân hàng" icon={Landmark}>
          <BankSearchSelect
            value={selectedBankId}
            onValueChange={(bankId) => updatePaymentProfile({ bankId })}
            options={VIETQR_BANK_OPTIONS}
            placeholder="Chọn ngân hàng"
          />
        </Field>
        <Field label="Số tài khoản" icon={CreditCard}>
          <input
            value={paymentProfile.accountNo}
            onChange={(event) => updatePaymentProfile({ accountNo: event.target.value })}
            className="field"
            placeholder="0123456789"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Tên chủ tài khoản" icon={UserRoundCheck}>
            <input
              value={paymentProfile.accountName}
              onChange={(event) => updatePaymentProfile({ accountName: event.target.value })}
              className="field"
              placeholder="NGUYEN VAN A"
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
}) {
  const payerId = form.payerId || game.participants[0]?.id || "";
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
    showInfoToast("Đã áp dụng gợi ý", suggestion.title);
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

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Nội dung" icon={ReceiptText}>
          <input
            data-expense-title-input="true"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="field"
            placeholder="Ăn tối"
          />
        </Field>
        <Field label="Số tiền" icon={Banknote}>
          <input
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: formatMoneyInput(event.target.value) })}
            className="field"
            inputMode="numeric"
            placeholder={formatMoney(AMOUNT_PLACEHOLDER_VALUE)}
          />
        </Field>
        <Field label="Phân loại" icon={Tags}>
          <div role="radiogroup" aria-label="Phân loại" className="flex flex-wrap gap-2">
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
        <Field label="Người trả" icon={WalletCards}>
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
              {isEditing ? "Cập nhật khoản chi" : "Thêm khoản chi"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 sm:h-10 sm:w-auto"
              >
                Hủy sửa
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {game.expenses.map((expense) => {
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
                    {payer?.name || "Không rõ"} trả, chia {expense.splitParticipantIds.length} người
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm font-semibold text-stone-950">{formatMoney(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onEdit(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-700 transition hover:bg-blue-50"
                    aria-label={`Sửa ${expense.title}`}
                  >
                    <Pencil size={16} />
                  </button>
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

function GameDashboard({
  game,
  readOnly = false,
  onAddReceipt,
  onRemoveReceipt,
}: {
  game: Game;
  readOnly?: boolean;
  onAddReceipt?: (participantId: string, amount: number) => void;
  onRemoveReceipt?: (receiptId: string) => void;
}) {
  const balances = calculateBalances(game);
  const receiptTotals = calculateReceiptTotals(game);
  const totalExpense = game.expenses.reduce((total, expense) => total + expense.amount, 0);
  const categorySummaries = summarizeExpenseCategories(game.expenses);
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
    <aside className="space-y-4 sm:space-y-5">
      {readOnly && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{game.name}</h1>
        </section>
      )}

      <PatternSummaryCard game={game} totalExpense={totalExpense} />

      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Metric label="Tổng chi" value={formatMoney(totalExpense)} icon={Banknote} />
        <Metric label="Số người" value={String(game.participants.length)} icon={Users} />
        <Metric label="Khoản chi" value={String(game.expenses.length)} icon={ReceiptText} />
      </section>

      <CategorySummaryCard summaries={categorySummaries} />

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <Equal size={18} className="text-emerald-700" aria-hidden="true" />
          Cân bằng
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
                    <span>Đã trả: {formatMoney(row.paid)}</span>
                    <span>Phải chịu: {formatMoney(row.owed)}</span>
                    {collected > 0 && <span>Đã thu: {formatMoney(collected)}</span>}
                    {row.balance < 0 && <span>Còn trả: {formatMoney(remaining)}</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">Chưa có người tham gia.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
          <QrCode size={18} className="text-emerald-700" aria-hidden="true" />
          Chuyển tiền cho chủ cuộc chơi
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
                        {row.participant.name} cần trả
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(remaining)}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Tổng nợ {formatMoney(grossAmount)}
                        {collected > 0 ? `, đã thu ${formatMoney(collected)}` : ""}
                      </p>
                    </div>
                    {!readOnly && onAddReceipt && (
                      <button
                        type="button"
                        onClick={() => onAddReceipt(row.participant.id, remaining)}
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Đã thu
                      </button>
                    )}
                  </div>
                  {hasOwnerQr ? (
                    <img
                      className="mt-3 w-full rounded-md border border-stone-200"
                      src={buildVietQrUrl(paymentProfile, remaining, game.code)}
                      alt="QR nhận tiền của chủ cuộc chơi"
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
              {readOnly || game.expenses.length > 0 ? "Không còn khoản cần chuyển." : "Thêm khoản chi để tính tiền."}
            </p>
          )}
          {receipts.length > 0 && (
            <div className="border-t border-stone-200 pt-3">
              <h4 className="text-sm font-semibold text-stone-950">Đã thu</h4>
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
                          aria-label="Xóa khoản thu"
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

function CategorySummaryCard({ summaries }: { summaries: ExpenseCategorySummary[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
        <Tags size={18} className="text-emerald-700" aria-hidden="true" />
        Theo phân loại
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
                    <p className="mt-1 text-xs text-stone-500">{summary.count} khoản</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-stone-950">{formatMoney(summary.total)}</span>
              </div>
            );
          })
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
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <Banknote size={15} aria-hidden="true" />
          Tổng đã chi
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
              placeholder="Tìm ngân hàng..."
              aria-label="Tìm ngân hàng"
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
              <p className="searchable-select-empty">Không tìm thấy ngân hàng.</p>
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
        Nhận {formatMoney(value)}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        <ArrowUpRight size={13} aria-hidden="true" />
        Trả {formatMoney(Math.abs(value))}
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
      <Equal size={13} aria-hidden="true" />
      Đủ
    </span>
  );
}

export default App;
