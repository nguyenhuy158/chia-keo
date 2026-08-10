import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Check,
  Images,
  Link as LinkIcon,
  ListChecks,
  Mail,
  MoreHorizontal,
  Pencil,
  Power,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { API_BASE } from "../adapters/browser/http-game-api";
import { CopyMenu } from "../components/CopyMenu";
import { ExpensePanel } from "../components/ExpensePanel";
import { GameDashboard } from "../components/GameDashboard";
import { HistoryPanel } from "../components/HistoryPanel";
import { OnboardingBanner } from "../components/OnboardingBanner";
import { PhotoPanel } from "../components/PhotoPanel";
import { ExpenseFab, type GameSection, MobileGameNav } from "../components/MobileGameNav";
import { useMobileShell } from "../components/mobile-shell";
import { ParticipantPanel } from "../components/ParticipantPanel";
import { SummaryImageCard } from "../components/SummaryImageCard";
import { BottomSheet } from "../components/overlays";
import { useConfirm } from "../components/ConfirmDialog";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "../components/ui";
import { formatMoney } from "../core/domain/money";
import {
  useAddExpense,
  useAddParticipant,
  useAddParticipants,
  useAddTransfer,
  useDeleteGame,
  useGame,
  usePhotos,
  useRemoveExpense,
  useRemoveParticipant,
  useRenameGame,
  useRotateShareLink,
  useSetSettlementHost,
  useSetSettlementMode,
  useSetShareLinkEnabled,
  useUpdateExpense,
  useUpdateParticipant,
} from "../adapters/react-query/queries";

export function GamePage() {
  const { gameId } = useParams({ from: "/app/games/$gameId" });
  const navigate = useNavigate();
  const confirm = useConfirm();
  const gameQuery = useGame(gameId);
  const photosQuery = usePhotos(gameId);

  const addParticipant = useAddParticipant(gameId);
  const addParticipants = useAddParticipants(gameId);
  const removeParticipant = useRemoveParticipant();
  const updateParticipant = useUpdateParticipant();
  const addExpense = useAddExpense(gameId);
  const updateExpense = useUpdateExpense();
  const removeExpense = useRemoveExpense();
  const addTransfer = useAddTransfer(gameId);
  const renameGame = useRenameGame(gameId);
  const rotateShareLink = useRotateShareLink(gameId);
  const setShareLinkEnabled = useSetShareLinkEnabled(gameId);
  const setSettlementMode = useSetSettlementMode(gameId);
  const setSettlementHost = useSetSettlementHost(gameId);
  const deleteGame = useDeleteGame();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<GameSection>("expenses");
  const [moreTab, setMoreTab] = useState<"photos" | "history">("photos");
  const shell = useMobileShell();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [emailPending, setEmailPending] = useState(false);

  if (gameQuery.isPending) {
    return <LoadingState />;
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

  async function handleRenameGame() {
    const name = (nameDraft || "").trim();
    if (!name || name === game.name) {
      setNameDraft(null);
      return;
    }

    await renameGame.mutateAsync(name);
    setNameDraft(null);
  }

  const participantPanel = (
    <ParticipantPanel
      participants={game.participants}
      pending={
        addParticipant.isPending || addParticipants.isPending || updateParticipant.isPending
      }
      onAdd={(input) => addParticipant.mutateAsync(input)}
      onAddMany={(people) => addParticipants.mutateAsync({ people })}
      onUpdate={(participantId, input) =>
        updateParticipant.mutateAsync({ participantId, input })
      }
      onRemove={(participantId) => removeParticipant.mutate(participantId)}
    />
  );

  const photos = photosQuery.data || [];

  const expensePanel = (
    <ExpensePanel
      gameId={game.id}
      participants={game.participants}
      expenses={game.expenses}
      photos={photos}
      pending={addExpense.isPending || updateExpense.isPending}
      onAdd={(input) => addExpense.mutateAsync(input)}
      onUpdate={(expenseId, input) => updateExpense.mutateAsync({ expenseId, input })}
      onRemove={(expenseId) => removeExpense.mutate(expenseId)}
      onAddTransfer={(input) => addTransfer.mutateAsync(input)}
    />
  );

  const photoPanel = (
    <PhotoPanel
      gameId={game.id}
      photos={photos}
      expenses={game.expenses}
      loading={photosQuery.isPending}
    />
  );

  const participantNameById = new Map(
    game.participants.map((participant) => [participant.id, participant.name]),
  );

  const dashboard = (
    <GameDashboard
      code={game.code}
      name={game.name}
      participants={game.participants}
      expenseCount={game.expenses.filter((expense) => expense.kind !== "transfer").length}
      summary={game.summary}
      settlementMode={game.settlementMode}
      settlementHostId={game.settlementHostId}
      onSettlementModeChange={(mode) => setSettlementMode.mutate(mode)}
      onSettlementHostChange={(participantId) => setSettlementHost.mutate(participantId)}
      expenses={game.expenses}
      onSettle={async (settlement) => {
        const fromName = participantNameById.get(settlement.fromParticipantId) || "Không rõ";
        const toName = participantNameById.get(settlement.toParticipantId) || "Không rõ";
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
      onRemoveTransfer={(expenseId) => removeExpense.mutate(expenseId)}
      settlePending={addTransfer.isPending}
    />
  );

  const summaryImageCard = (
    <SummaryImageCard
      input={{
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
      }}
    />
  );

  const emailAction = (
    <button
      type="button"
      disabled={emailPending}
      onClick={async () => {
        setEmailPending(true);
        try {
          const response = await fetch(`${API_BASE}/api/games/${game.id}/email-summary`, {
            method: "POST",
            credentials: "include",
          });
          if (!response.ok) throw new Error();
          toast.success("Đã gửi email tóm tắt về hộp thư của bạn");
        } catch {
          toast.error("Gửi email thất bại, thử lại sau");
        } finally {
          setEmailPending(false);
        }
      }}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
    >
      <Mail size={15} />
      {emailPending ? "Đang gửi..." : "Email cho tôi"}
    </button>
  );

  const copyAction = (
    <CopyMenu
      input={{
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
      }}
    />
  );

  const shareActions = shareLink ? (
    <>
      <button
        type="button"
        onClick={() => setShareLinkEnabled.mutate(!shareLink.enabled)}
        disabled={setShareLinkEnabled.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
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
        onClick={() => rotateShareLink.mutate()}
        disabled={rotateShareLink.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        title="Tạo token mới, link cũ sẽ hết hiệu lực"
      >
        <RefreshCw size={16} />
        Đổi link
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => rotateShareLink.mutate()}
      disabled={rotateShareLink.isPending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
    >
      <LinkIcon size={16} />
      Tạo link share
    </button>
  );

  const deleteAction = (
    <button
      type="button"
      onClick={handleDeleteGame}
      disabled={deleteGame.isPending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-stone-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
    >
      <Trash2 size={16} />
      Xóa
    </button>
  );

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="min-w-0">
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{game.code}</p>
          {nameDraft !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRenameGame();
                  if (event.key === "Escape") setNameDraft(null);
                }}
                className="field max-w-xs text-lg font-semibold"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRenameGame}
                disabled={renameGame.isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-700"
                aria-label="Lưu tên cuộc chơi"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setNameDraft(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-300 text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
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
              <button
                type="button"
                onClick={() => setNameDraft(game.name)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                aria-label="Đổi tên cuộc chơi"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
        </div>
        {/* Desktop: cac nut hien inline. */}
        <div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
          {copyAction}
          {emailAction}
          {shareActions}
          {deleteAction}
        </div>
        {/* Mobile: nut chuyen cuoc choi va nut mo bottom sheet tuy chon. */}
        <button
          type="button"
          onClick={() => shell?.openGames()}
          aria-label="Danh sách cuộc chơi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700 lg:hidden"
        >
          <ListChecks size={20} />
        </button>
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label="Tùy chọn cuộc chơi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700 lg:hidden"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <OnboardingBanner
        participantCount={game.participants.length}
        expenseCount={game.expenses.filter((expense) => expense.kind !== "transfer").length}
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
        </div>
      </div>

      {/* Mobile layout: mot phan mot man hinh, dieu huong bang bottom nav. */}
      <div className="space-y-5 pb-28 lg:hidden">
        {activeSection === "people" && participantPanel}
        {activeSection === "expenses" && expensePanel}
        {activeSection === "summary" && dashboard}
        {activeSection === "summary" && summaryImageCard}
        {activeSection === "more" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoreTab("photos")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  moreTab === "photos"
                    ? "bg-violet-600 text-white"
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
                    ? "bg-violet-600 text-white"
                    : "border border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300"
                }`}
              >
                Lịch sử
              </button>
            </div>
            {moreTab === "photos" && photoPanel}
            {moreTab === "history" && <HistoryPanel gameId={game.id} />}
          </div>
        )}
        {activeSection === "summary" && (
          <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 [&>button]:w-full">
            {copyAction}
            {emailAction}
          </div>
        )}
      </div>

      {/* Tab anh (trong Khac) co nut them anh rieng nen khong hien FAB khoan chi. */}
      {activeSection !== "expenses" && !(activeSection === "more" && moreTab === "photos") && (
        <ExpenseFab onClick={() => setActiveSection("expenses")} />
      )}
      <MobileGameNav active={activeSection} onChange={setActiveSection} />

      <BottomSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Tùy chọn cuộc chơi"
      >
        <div className="flex flex-col gap-2 pb-2 [&>button]:w-full">
          {copyAction}
          {emailAction}
          {shareActions}
          {deleteAction}
        </div>
      </BottomSheet>
    </>
  );
}
