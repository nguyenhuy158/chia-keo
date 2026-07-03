import { useNavigate, useParams } from "@tanstack/react-router";
import { Copy, Link as LinkIcon, Power, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExpensePanel } from "../components/ExpensePanel";
import { GameDashboard } from "../components/GameDashboard";
import { ParticipantPanel } from "../components/ParticipantPanel";
import { EmptyState, LoadingState } from "../components/ui";
import {
  useAddExpense,
  useAddParticipant,
  useDeleteGame,
  useGame,
  useRemoveExpense,
  useRemoveParticipant,
  useRotateShareLink,
  useSetShareLinkEnabled,
} from "../lib/queries";

const COPY_FEEDBACK_MS = 1600;

export function GamePage() {
  const { gameId } = useParams({ from: "/app/games/$gameId" });
  const navigate = useNavigate();
  const gameQuery = useGame(gameId);

  const addParticipant = useAddParticipant(gameId);
  const removeParticipant = useRemoveParticipant();
  const addExpense = useAddExpense(gameId);
  const removeExpense = useRemoveExpense();
  const rotateShareLink = useRotateShareLink(gameId);
  const setShareLinkEnabled = useSetShareLinkEnabled(gameId);
  const deleteGame = useDeleteGame();

  const [copiedShare, setCopiedShare] = useState(false);

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
    await navigator.clipboard?.writeText(shareUrl);
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), COPY_FEEDBACK_MS);
  }

  async function handleDeleteGame() {
    if (!window.confirm(`Xoa cuoc choi "${game.name}"?`)) return;

    await deleteGame.mutateAsync(game.id);
    navigate({ to: "/" });
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{game.code}</p>
          <h2 className="text-2xl font-semibold text-stone-950">{game.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shareLink ? (
            <>
              <button
                type="button"
                onClick={handleCopyShareLink}
                disabled={!shareLink.enabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                {copiedShare ? <Copy size={16} /> : <LinkIcon size={16} />}
                {copiedShare ? "Da copy" : shareLink.enabled ? "Copy link share" : "Link dang tat"}
              </button>
              <button
                type="button"
                onClick={() => setShareLinkEnabled.mutate(!shareLink.enabled)}
                disabled={setShareLinkEnabled.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                title={shareLink.enabled ? "Tat link share" : "Bat link share"}
              >
                <Power size={16} className={shareLink.enabled ? "text-emerald-700" : "text-red-600"} />
                {shareLink.enabled ? "Tat link" : "Bat link"}
              </button>
              <button
                type="button"
                onClick={() => rotateShareLink.mutate()}
                disabled={rotateShareLink.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <LinkIcon size={16} />
              Tao link share
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteGame}
            disabled={deleteGame.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={16} />
            Xoa
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ParticipantPanel
            participants={game.participants}
            pending={addParticipant.isPending}
            onAdd={(input) => addParticipant.mutateAsync(input)}
            onRemove={(participantId) => removeParticipant.mutate(participantId)}
          />
          <ExpensePanel
            participants={game.participants}
            expenses={game.expenses}
            pending={addExpense.isPending}
            onAdd={(input) => addExpense.mutateAsync(input)}
            onRemove={(expenseId) => removeExpense.mutate(expenseId)}
          />
        </div>
        <GameDashboard
          code={game.code}
          name={game.name}
          participants={game.participants}
          expenseCount={game.expenses.length}
          summary={game.summary}
        />
      </div>
    </>
  );
}
