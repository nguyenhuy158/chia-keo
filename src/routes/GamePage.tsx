import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  CircleCheckBig,
  Images,
  Link as LinkIcon,
  ListChecks,
  Mail,
  MoreHorizontal,
  Pencil,
  Power,
  RefreshCw,
  RotateCcw,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { describeCloseMode, isClosed } from "../../shared/game-closing";
import { API_BASE } from "../adapters/browser/http-game-api";
import { renderSharePreviewImage } from "../adapters/browser/share-preview-image";
import {
  findUndoableExpenseRemoval,
  useAddExpense,
  useAddParticipant,
  useAddParticipants,
  useAddTransfer,
  useCloseGame,
  useDeleteGame,
  useGame,
  usePhotos,
  useRemoveExpense,
  useRemoveParticipant,
  useRenameGame,
  useReopenGame,
  useReorderExpenses,
  useReorderParticipants,
  useRotateShareLink,
  useSaveSharePreview,
  useSetExpenseExcluded,
  useSetSettlementHost,
  useSetSettlementMode,
  useSetShareLinkEnabled,
  useUndoGameEvent,
  useUpdateExpense,
  useUpdateParticipant,
} from "../adapters/react-query/queries";
import { CollaboratorsPanel } from "../components/CollaboratorsPanel";
import { useConfirm } from "../components/ConfirmDialog";
import { CopyMenu } from "../components/CopyMenu";
import { ExpensePanel } from "../components/ExpensePanel";
import { GameDashboard } from "../components/GameDashboard";
import { GameSettingsPanel } from "../components/GameSettingsPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { type GameSection, MobileGameNav } from "../components/MobileGameNav";
import { useMobileShell } from "../components/mobile-shell";
import { OnboardingBanner } from "../components/OnboardingBanner";
import { ParticipantPanel } from "../components/ParticipantPanel";
import { PhotoPanel } from "../components/PhotoPanel";
import { SummaryImageCard } from "../components/SummaryImageCard";
import { EmptyState, GamePageSkeleton } from "../components/ui";
import { formatMoney } from "../core/domain/money";
import { Menu, type MenuItem } from "../ui/Menu";
import { Sheet } from "../ui/Sheet";

export function GamePage() {
  const { gameId } = useParams({ from: "/app/games/$gameId" });
  const navigate = useNavigate();
  const confirm = useConfirm();
  const gameQuery = useGame(gameId);
  const photosQuery = usePhotos(gameId);

  const addParticipant = useAddParticipant(gameId);
  const addParticipants = useAddParticipants(gameId);
  const removeParticipant = useRemoveParticipant();
  const reorderParticipants = useReorderParticipants(gameId);
  const updateParticipant = useUpdateParticipant();
  const addExpense = useAddExpense(gameId);
  const updateExpense = useUpdateExpense();
  const removeExpense = useRemoveExpense();
  const setExpenseExcluded = useSetExpenseExcluded();
  const undoEvent = useUndoGameEvent();
  const reorderExpenses = useReorderExpenses(gameId);
  const addTransfer = useAddTransfer(gameId);
  const renameGame = useRenameGame(gameId);
  const rotateShareLink = useRotateShareLink(gameId);
  const setShareLinkEnabled = useSetShareLinkEnabled(gameId);
  const saveSharePreview = useSaveSharePreview(gameId);
  const setSettlementMode = useSetSettlementMode(gameId);
  const setSettlementHost = useSetSettlementHost(gameId);
  const deleteGame = useDeleteGame();
  const closeGame = useCloseGame();
  const reopenGame = useReopenGame();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<GameSection>("expenses");
  const [moreTab, setMoreTab] = useState<"photos" | "history" | "share">(
    "photos",
  );
  const shell = useMobileShell();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareSheet, setShareSheet] = useState<
    "image" | "collaborators" | null
  >(null);
  const [emailPending, setEmailPending] = useState(false);

  if (gameQuery.isPending) {
    return <GamePageSkeleton />;
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <EmptyState
        title="Không tìm thấy cuộc chơi"
        description="Cuộc chơi không tồn tại hoặc bạn không có quyền xem."
      />
    );
  }

  const game = gameQuery.data;
  const shareLink = game.shareLink;

  async function handleDeleteGame() {
    // Xoa mem: noi ro la con lay lai duoc, khong thi nguoi dung tuong mat het
    // va khong biet co thung rac o sidebar.
    const ok = await confirm({
      title: `Chuyển "${game.name}" vào thùng rác?`,
      description: "Phục hồi được ở sidebar.",
      confirmLabel: "Chuyển vào thùng rác",
      destructive: true,
    });
    if (!ok) return;

    await deleteGame.mutateAsync(game.id);
    toast.success("Đã chuyển vào thùng rác");
    navigate({ to: "/" });
  }

  async function handleCloseGame() {
    // Dong cuoc choi la thao tac "chot lai": noi ro con mo lai duoc de nguoi
    // dung khong so bam nham la mat cuoc.
    const ok = await confirm({
      title: `Đóng "${game.name}"?`,
      description:
        "Cuộc chơi rời khỏi danh sách đang chơi, mở lại được ở mục “Đã đóng”.",
      confirmLabel: "Đóng cuộc chơi",
    });
    if (!ok) return;

    try {
      await closeGame.mutateAsync(game.id);
      toast.success("Đã đóng cuộc chơi");
    } catch {
      toast.error("Không đóng được");
    }
  }

  async function handleReopenGame() {
    try {
      await reopenGame.mutateAsync(game.id);
      toast.success("Đã mở lại cuộc chơi");
    } catch {
      toast.error("Không mở lại được");
    }
  }

  async function handleRotateShareLink() {
    const ok = await confirm({
      title: "Tạo link chia sẻ mới?",
      description:
        "Link cũ sẽ hết hiệu lực ngay, ai đang xem sẽ mất quyền truy cập.",
      confirmLabel: "Tạo link mới",
      destructive: true,
    });
    if (!ok) return;
    rotateShareLink.mutate(undefined, {
      onSuccess: () => toast.success("Đã tạo link mới"),
    });
  }

  async function handleRemoveExpense(expenseId: string) {
    // Xoa ngay, khong hoi lai: khoan chi/chuyen tien la loai duy nhat ma
    // ha tang lich su hoan tac duoc (canUndoEvent), nen thay confirm bang
    // toast "Hoan tac" kieu Gmail cho nhanh tay hon.
    const target = game.expenses.find((expense) => expense.id === expenseId);
    await removeExpense.mutateAsync(expenseId);
    const eventId = target
      ? await findUndoableExpenseRemoval(game.id, {
          title: target.title,
          amount: target.amount,
        })
      : null;

    toast(target ? `Đã xóa "${target.title}"` : "Đã xóa khoản chi", {
      action: eventId
        ? {
            label: "Hoàn tác",
            onClick: () => {
              undoEvent.mutateAsync(eventId).then(
                () => toast.success("Đã dựng lại khoản chi"),
                () =>
                  toast.error(
                    "Không hoàn tác được — người liên quan không còn trong cuộc chia",
                  ),
              );
            },
          }
        : undefined,
    });
  }

  async function handleRenameGame(draft: string) {
    const name = draft.trim();
    if (!name || name === game.name) {
      setNameDraft(null);
      return;
    }

    await renameGame.mutateAsync(name);
    setNameDraft(null);
  }

  const renderParticipantPanel = (compact: boolean) => (
    <ParticipantPanel
      compact={compact}
      participants={game.participants}
      pending={
        addParticipant.isPending ||
        addParticipants.isPending ||
        updateParticipant.isPending
      }
      onAdd={(input) => addParticipant.mutateAsync(input)}
      onAddMany={(people) => addParticipants.mutateAsync({ people })}
      onUpdate={(participantId, input) =>
        updateParticipant.mutateAsync({ participantId, input })
      }
      onRemove={(participantId) => removeParticipant.mutate(participantId)}
      onReorder={(participantIds) => reorderParticipants.mutate(participantIds)}
    />
  );
  const participantPanel = renderParticipantPanel(false);
  const compactParticipantPanel = renderParticipantPanel(true);

  const photos = photosQuery.data || [];

  const expensePanelProps = {
    gameId: game.id,
    participants: game.participants,
    expenses: game.expenses,
    photos,
    pending: addExpense.isPending || updateExpense.isPending,
    onAdd: (input: Parameters<typeof addExpense.mutateAsync>[0]) =>
      addExpense.mutateAsync(input),
    onUpdate: (
      expenseId: string,
      input: Parameters<typeof updateExpense.mutateAsync>[0]["input"],
    ) => updateExpense.mutateAsync({ expenseId, input }),
    onRemove: handleRemoveExpense,
    onToggleExcluded: (expenseId: string, excluded: boolean) =>
      setExpenseExcluded.mutate({ expenseId, excluded }),
    onAddTransfer: (input: Parameters<typeof addTransfer.mutateAsync>[0]) =>
      addTransfer.mutateAsync(input),
    onReorder: (expenseIds: string[]) => reorderExpenses.mutate(expenseIds),
  };
  const expensePanel = <ExpensePanel {...expensePanelProps} />;
  const compactExpensePanel = <ExpensePanel {...expensePanelProps} compact />;

  const renderPhotoPanel = (compact: boolean) => (
    <PhotoPanel
      gameId={game.id}
      photos={photos}
      expenses={game.expenses}
      loading={photosQuery.isPending}
      compact={compact}
    />
  );
  const photoPanel = renderPhotoPanel(false);
  const compactPhotoPanel = renderPhotoPanel(true);

  const participantNameById = new Map(
    game.participants.map((participant) => [participant.id, participant.name]),
  );

  const renderDashboard = (compact: boolean) => (
    <GameDashboard
      compact={compact}
      code={game.code}
      name={game.name}
      participants={game.participants}
      expenseCount={
        game.expenses.filter(
          (expense) => expense.kind !== "transfer" && !expense.excluded,
        ).length
      }
      summary={game.summary}
      settlementMode={game.settlementMode}
      settlementHostId={game.settlementHostId}
      onSettlementModeChange={(mode) =>
        setSettlementMode.mutate(mode, {
          onSuccess: () => toast.success("Đã đổi cách chia tiền"),
        })
      }
      onSettlementHostChange={(participantId) =>
        setSettlementHost.mutate(participantId, {
          onSuccess: () => toast.success("Đã đổi người giữ tiền"),
        })
      }
      expenses={game.expenses}
      onSettle={async (settlement) => {
        const fromName =
          participantNameById.get(settlement.fromParticipantId) || "Không rõ";
        const toName =
          participantNameById.get(settlement.toParticipantId) || "Không rõ";
        const ok = await confirm({
          title: `Ghi nhận ${fromName} đã trả ${toName}?`,
          description: `Số tiền ${formatMoney(settlement.amount)}.`,
          confirmLabel: "Ghi nhận",
        });
        if (!ok) return;
        await addTransfer.mutateAsync({
          fromParticipantId: settlement.fromParticipantId,
          toParticipantId: settlement.toParticipantId,
          amount: settlement.amount,
          note: "",
        });
        toast.success("Đã ghi nhận trả nợ");
      }}
      onRemoveTransfer={handleRemoveExpense}
      settlePending={addTransfer.isPending}
    />
  );
  const dashboard = renderDashboard(false);
  const compactDashboard = renderDashboard(true);

  const summaryInput = {
    code: game.code,
    name: game.name,
    participants: game.participants,
    expenses: game.expenses,
    summary: game.summary,
    settlementMode: game.settlementMode,
    settlementHostId: game.settlementHostId,
    shareUrl:
      shareLink && shareLink.enabled
        ? `${window.location.origin}/share/${shareLink.token}`
        : undefined,
  };

  function publishSharePreview(backgroundId: string) {
    renderSharePreviewImage(summaryInput, backgroundId)
      .then((data) => saveSharePreview.mutateAsync(data))
      .catch((error) => console.error("Share preview upload failed:", error));
  }

  const summaryImageCard = (
    <SummaryImageCard
      input={summaryInput}
      onShare={publishSharePreview}
      collapsible
    />
  );

  async function handleEmailSummary() {
    setEmailPending(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/games/${game.id}/email-summary`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error();
      toast.success("Đã gửi email tóm tắt về hộp thư của bạn");
    } catch {
      toast.error("Gửi email thất bại, thử lại sau");
    } finally {
      setEmailPending(false);
    }
  }

  function handleToggleShareLink(enabled: boolean) {
    setShareLinkEnabled.mutate(!enabled, {
      onSuccess: () => toast.success(enabled ? "Đã tắt link" : "Đã bật link"),
    });
  }

  function handleCreateShareLink() {
    rotateShareLink.mutate(undefined, {
      onSuccess: () => toast.success("Đã tạo link chia sẻ"),
    });
  }

  const emailAction = (
    <button
      type="button"
      disabled={emailPending}
      onClick={handleEmailSummary}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-3 text-sm font-medium text-stone-700 transition hover:bg-surface-muted disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
    >
      <Mail size={15} />
      {emailPending ? "Đang gửi..." : "Email cho tôi"}
    </button>
  );

  const copyAction = (
    <CopyMenu input={summaryInput} onShare={publishSharePreview} />
  );

  const shareActions = shareLink ? (
    <>
      <button
        type="button"
        onClick={() => handleToggleShareLink(shareLink.enabled)}
        disabled={setShareLinkEnabled.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-3 text-sm font-medium text-stone-700 transition hover:bg-surface-muted dark:border-stone-700 dark:text-stone-200"
        title={shareLink.enabled ? "Tắt link share" : "Bật link share"}
      >
        <Power
          size={16}
          className={
            shareLink.enabled
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
        {shareLink.enabled ? "Tắt link" : "Bật link"}
      </button>
      <button
        type="button"
        onClick={handleRotateShareLink}
        disabled={rotateShareLink.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-3 text-sm font-medium text-stone-700 transition hover:bg-surface-muted dark:border-stone-700 dark:text-stone-200"
        title="Tạo token mới, link cũ sẽ hết hiệu lực"
      >
        <RefreshCw size={16} />
        Đổi link
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={handleCreateShareLink}
      disabled={rotateShareLink.isPending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-3 text-sm font-medium text-stone-700 transition hover:bg-surface-muted dark:border-stone-700 dark:text-stone-200"
    >
      <LinkIcon size={16} />
      Tạo link share
    </button>
  );

  const closed = isClosed(game);

  /** Chi chu cuoc choi dong / mo lai duoc; nguoi duoc chia se chi thay trang thai. */
  const closeAction = game.isOwner ? (
    closed ? (
      <button
        type="button"
        onClick={handleReopenGame}
        disabled={reopenGame.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-3 text-sm font-medium text-stone-700 transition hover:bg-surface-muted disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
      >
        <RotateCcw size={16} />
        Mở lại
      </button>
    ) : (
      <button
        type="button"
        onClick={handleCloseGame}
        disabled={closeGame.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-surface px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        <CircleCheckBig size={16} />
        Đóng
      </button>
    )
  ) : null;

  const deleteAction = game.isOwner ? (
    <button
      type="button"
      onClick={handleDeleteGame}
      disabled={deleteGame.isPending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rose-200 bg-surface px-3 text-sm font-medium text-danger transition hover:bg-danger-soft dark:border-rose-900/60"
    >
      <Trash2 size={16} />
      Xóa
    </button>
  ) : null;

  const moreItems: MenuItem[] = [
    {
      label: "Cài đặt",
      icon: <Settings size={15} />,
      onSelect: () => setSettingsOpen(true),
    },
    {
      label: emailPending ? "Đang gửi..." : "Email cho tôi",
      icon: <Mail size={15} />,
      disabled: emailPending,
      onSelect: handleEmailSummary,
    },
    ...(shareLink
      ? [
          {
            label: shareLink.enabled ? "Tắt link" : "Bật link",
            icon: <Power size={15} />,
            disabled: setShareLinkEnabled.isPending,
            onSelect: () => handleToggleShareLink(shareLink.enabled),
          },
          {
            label: "Đổi link",
            icon: <RefreshCw size={15} />,
            disabled: rotateShareLink.isPending,
            onSelect: handleRotateShareLink,
          },
        ]
      : [
          {
            label: "Tạo link share",
            icon: <LinkIcon size={15} />,
            disabled: rotateShareLink.isPending,
            onSelect: handleCreateShareLink,
          },
        ]),
    ...(game.isOwner
      ? [
          {
            label: "Xóa cuộc chơi",
            icon: <Trash2 size={15} />,
            destructive: true,
            disabled: deleteGame.isPending,
            onSelect: handleDeleteGame,
          },
        ]
      : []),
  ];

  const collaboratorsPanel = (
    <CollaboratorsPanel
      gameId={game.id}
      isOwner={game.isOwner}
      collaborators={game.collaborators}
      collapsible
    />
  );

  return (
    <div
      data-one-screen
      className="flex h-full min-h-0 flex-col lg:block lg:h-auto"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2 shadow-sm lg:mb-5 lg:p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            {game.code}
          </p>
          {nameDraft !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRenameGame(nameDraft);
                  if (event.key === "Escape") setNameDraft(null);
                }}
                className="field max-w-xs text-lg font-semibold"
                // biome-ignore lint/a11y/noAutofocus: inline rename opens on user action
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleRenameGame(nameDraft)}
                disabled={renameGame.isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white transition hover:bg-primary-hover"
                aria-label="Lưu tên cuộc chơi"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setNameDraft(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-300 text-stone-600 transition hover:bg-surface-muted dark:border-stone-700 dark:text-stone-300"
                aria-label="Hủy đổi tên"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-stone-950 dark:text-stone-50 sm:text-2xl">
                {game.name}
              </h2>
              {closed && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CircleCheckBig size={12} />
                  Đã đóng · {describeCloseMode(game.closeMode)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setNameDraft(game.name)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                aria-label="Đổi tên cuộc chơi"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
        </div>
        {/* Desktop: hai nut chinh, phan con lai nam trong menu. */}
        <div className="hidden items-center justify-end gap-2 lg:flex">
          {copyAction}
          {closeAction}
          <Menu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-haspopup="menu"
                aria-label="Thêm tùy chọn cuộc chơi"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-surface-muted dark:border-stone-700 dark:text-stone-200"
              >
                <MoreHorizontal size={20} />
              </button>
            )}
            items={moreItems}
          />
        </div>
        {/* Mobile: nut chuyen cuoc choi va nut mo bottom sheet tuy chon. */}
        <button
          type="button"
          onClick={() => shell?.openGames()}
          aria-label="Danh sách cuộc chơi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-surface-muted active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:active:bg-stone-700 lg:hidden"
        >
          <ListChecks size={20} />
        </button>
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label="Tùy chọn cuộc chơi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-surface-muted active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:active:bg-stone-700 lg:hidden"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <OnboardingBanner
        participantCount={game.participants.length}
        expenseCount={
          game.expenses.filter((expense) => expense.kind !== "transfer").length
        }
      />

      {/* Desktop layout: giu nguyen bo cuc luoi. */}
      <div className="hidden gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {participantPanel}
          {expensePanel}
          {photoPanel}
          <HistoryPanel gameId={game.id} collapsible />
        </div>
        <div className="space-y-5">
          {dashboard}
          {summaryImageCard}
          {collaboratorsPanel}
        </div>
      </div>

      {/* Mobile layout: mot phan mot man hinh, dieu huong bang bottom nav.
          Tab da gon (Chi) tu chia trang, khong cuon; cac tab con lai tam thoi
          cuon trong khung cho toi khi doi xong (chiakeo#76). */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
          {activeSection === "people" && compactParticipantPanel}
          {activeSection === "expenses" && compactExpensePanel}
          {activeSection === "summary" && compactDashboard}
          {activeSection === "more" && (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setMoreTab("photos")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    moreTab === "photos"
                      ? "bg-primary text-white"
                      : "border border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300"
                  }`}
                >
                  <Images size={14} className="mr-1 inline" />
                  Ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setMoreTab("history")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    moreTab === "history"
                      ? "bg-primary text-white"
                      : "border border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300"
                  }`}
                >
                  Lịch sử
                </button>
                <button
                  type="button"
                  onClick={() => setMoreTab("share")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    moreTab === "share"
                      ? "bg-primary text-white"
                      : "border border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300"
                  }`}
                >
                  Chia sẻ
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {moreTab === "share" && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShareSheet("image")}
                      className="flex h-14 items-center justify-between rounded-md border border-border px-3 text-sm font-semibold text-stone-950 dark:text-stone-50"
                    >
                      Ảnh tổng kết
                      <ChevronRight size={16} className="text-fg-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareSheet("collaborators")}
                      className="flex h-14 items-center justify-between rounded-md border border-border px-3 text-sm font-semibold text-stone-950 dark:text-stone-50"
                    >
                      Chia sẻ cuộc chơi với người khác
                      <ChevronRight size={16} className="text-fg-muted" />
                    </button>
                  </div>
                )}
                {moreTab === "photos" && compactPhotoPanel}
                {moreTab === "history" && (
                  <HistoryPanel gameId={game.id} compact />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab anh (trong Khac) co nut them anh rieng nen khong hien FAB khoan chi. */}

        <MobileGameNav active={activeSection} onChange={setActiveSection} />
      </div>

      <Sheet
        open={shareSheet !== null}
        onClose={() => setShareSheet(null)}
        title={shareSheet === "image" ? "Ảnh tổng kết" : "Chia sẻ cuộc chơi"}
      >
        {shareSheet === "image" && summaryImageCard}
        {shareSheet === "collaborators" && collaboratorsPanel}
      </Sheet>

      <Sheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Tùy chọn cuộc chơi"
      >
        <div className="flex flex-col gap-2 pb-2 [&>button]:w-full">
          {copyAction}
          {emailAction}
          {shareActions}
          {closeAction}
          {deleteAction}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <GameSettingsPanel />
        </div>
      </Sheet>

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Cài đặt"
      >
        <GameSettingsPanel />
      </Sheet>
    </div>
  );
}
