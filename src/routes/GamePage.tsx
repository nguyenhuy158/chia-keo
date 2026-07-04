import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Power,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { ExpensePanel } from "../components/ExpensePanel";
import { GameDashboard } from "../components/GameDashboard";
import { ExpenseFab, type GameSection, MobileGameNav } from "../components/MobileGameNav";
import { ParticipantPanel } from "../components/ParticipantPanel";
import { BottomSheet } from "../components/overlays";
import { useToast } from "../components/Toast";
import { EmptyState, LoadingState } from "../components/ui";
import {
  useAddExpense,
  useAddParticipant,
  useDeleteGame,
  useGame,
  useRemoveExpense,
  useRemoveParticipant,
  useRenameGame,
  useRotateShareLink,
  useSetShareLinkEnabled,
  useUpdateExpense,
} from "../lib/queries";

const COPY_FEEDBACK_MS = 1600;

export function GamePage() {
  const { gameId } = useParams({ from: "/app/games/$gameId" });
  const navigate = useNavigate();
  const toast = useToast();
  const gameQuery = useGame(gameId);

  const addParticipant = useAddParticipant(gameId);
  const removeParticipant = useRemoveParticipant();
  const addExpense = useAddExpense(gameId);
  const updateExpense = useUpdateExpense();
  const removeExpense = useRemoveExpense();
  const renameGame = useRenameGame(gameId);
  const rotateShareLink = useRotateShareLink(gameId);
  const setShareLinkEnabled = useSetShareLinkEnabled(gameId);
  const deleteGame = useDeleteGame();

  const [copiedShare, setCopiedShare] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<GameSection>("expenses");
  const [actionsOpen, setActionsOpen] = useState(false);

  if (gameQuery.isPending) {
    return <LoadingState />;
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <EmptyState
        title="Khong tim thay cuoc choi"
        description="Cuoc choi khong ton tai hoac ban khong co quyen xem."
      />
    );
  }

  const game = gameQuery.data;
  const shareLink = game.shareLink;

  async function handleCopyShareLink() {
    if (!shareLink) return;

    const shareUrl = `${window.location.origin}/share/${shareLink.token}`;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedShare(true);
      toast("Da sao chep link chia se");
      window.setTimeout(() => setCopiedShare(false), COPY_FEEDBACK_MS);
    } catch {
      toast("Khong sao chep duoc link", "error");
    }
  }

  async function handleDeleteGame() {
    if (!window.confirm(`Xoa cuoc choi "${game.name}"?`)) return;

    await deleteGame.mutateAsync(game.id);
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
      pending={addParticipant.isPending}
      onAdd={(input) => addParticipant.mutateAsync(input)}
      onRemove={(participantId) => removeParticipant.mutate(participantId)}
    />
  );

  const expensePanel = (
    <ExpensePanel
      gameId={game.id}
      participants={game.participants}
      expenses={game.expenses}
      pending={addExpense.isPending || updateExpense.isPending}
      onAdd={(input) => addExpense.mutateAsync(input)}
      onUpdate={(expenseId, input) => updateExpense.mutateAsync({ expenseId, input })}
      onRemove={(expenseId) => removeExpense.mutate(expenseId)}
    />
  );

  const dashboard = (
    <GameDashboard
      code={game.code}
      name={game.name}
      participants={game.participants}
      expenseCount={game.expenses.length}
      summary={game.summary}
    />
  );

  const shareActions = shareLink ? (
    <>
      <button
        type="button"
        onClick={handleCopyShareLink}
        disabled={!shareLink.enabled}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 dark:disabled:text-stone-600"
      >
        {copiedShare ? <Copy size={16} /> : <LinkIcon size={16} />}
        {copiedShare ? "Da copy" : shareLink.enabled ? "Copy link share" : "Link dang tat"}
      </button>
      <button
        type="button"
        onClick={() => setShareLinkEnabled.mutate(!shareLink.enabled)}
        disabled={setShareLinkEnabled.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        title={shareLink.enabled ? "Tat link share" : "Bat link share"}
      >
        <Power
          size={16}
          className={
            shareLink.enabled
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
        {shareLink.enabled ? "Tat link" : "Bat link"}
      </button>
      <button
        type="button"
        onClick={() => rotateShareLink.mutate()}
        disabled={rotateShareLink.isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        title="Tao token moi, link cu se het hieu luc"
      >
        <RefreshCw size={16} />
        Doi link
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
      Tao link share
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
      Xoa
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
                aria-label="Luu ten cuoc choi"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setNameDraft(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-300 text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                aria-label="Huy doi ten"
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
                aria-label="Doi ten cuoc choi"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
        </div>
        {/* Desktop: cac nut hien inline. */}
        <div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
          {shareActions}
          {deleteAction}
        </div>
        {/* Mobile: gom vao mot nut mo bottom sheet. */}
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label="Tùy chọn cuộc chơi"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700 lg:hidden"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Desktop layout: giu nguyen bo cuc luoi. */}
      <div className="hidden gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {participantPanel}
          {expensePanel}
        </div>
        {dashboard}
      </div>

      {/* Mobile layout: mot phan mot man hinh, dieu huong bang bottom nav. */}
      <div className="space-y-5 pb-28 lg:hidden">
        {activeSection === "people" && participantPanel}
        {activeSection === "expenses" && expensePanel}
        {activeSection === "summary" && dashboard}
      </div>

      {activeSection !== "expenses" && <ExpenseFab onClick={() => setActiveSection("expenses")} />}
      <MobileGameNav active={activeSection} onChange={setActiveSection} />

      <BottomSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Tuy chon cuoc choi"
      >
        <div className="flex flex-col gap-2 pb-2 [&>button]:w-full">
          {shareActions}
          {deleteAction}
        </div>
      </BottomSheet>
    </>
  );
}
