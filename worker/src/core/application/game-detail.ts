import type {
  ApiExpense,
  ApiGameDetail,
  ApiParticipant,
  ApiShareLink,
  ApiShareView,
  ApiSummary,
} from "../../../../shared/api-types";
import {
  capitalizeName,
  DEFAULT_SETTLEMENT_MODE,
  settlementModeSchema,
} from "../../../../shared/schemas";
import { calculateBalances, calculateSettlements } from "../../../../shared/split";
import type { GameRepository, GameRow } from "../ports/game-repository";

/** Cot trong DB la TEXT tu do, ep ve mot gia tri hop le truoc khi tra ve. */
function toSettlementMode(value: string) {
  const parsed = settlementModeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SETTLEMENT_MODE;
}

type GameData = {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  summary: ApiSummary;
};

async function loadGameData(repo: GameRepository, gameId: string): Promise<GameData> {
  const participantRows = await repo.participants.listByGame(gameId);
  const participantIds = participantRows.map((row) => row.id);

  const paymentRows = await repo.paymentProfiles.listByParticipantIds(participantIds);
  const paymentByParticipantId = new Map(paymentRows.map((row) => [row.participantId, row]));

  const expenseRows = await repo.expenses.listByGame(gameId);
  const splitRows = await repo.splits.listByExpenseIds(expenseRows.map((row) => row.id));

  const splitsByExpenseId = new Map<string, typeof splitRows>();
  for (const split of splitRows) {
    const list = splitsByExpenseId.get(split.expenseId) || [];
    list.push(split);
    splitsByExpenseId.set(split.expenseId, list);
  }

  const participants: ApiParticipant[] = participantRows.map((row) => {
    const payment = paymentByParticipantId.get(row.id);
    return {
      id: row.id,
      // Ten cu trong DB co the chua viet hoa; chuan hoa luc doc de khong can
      // migration rieng cho du lieu san co.
      name: capitalizeName(row.name),
      bankId: payment?.bankId || "",
      accountNo: payment?.accountNo || "",
      accountName: payment?.accountName || "",
    };
  });

  const expenses: ApiExpense[] = expenseRows.map((row) => {
    const splits = splitsByExpenseId.get(row.id) || [];
    return {
      id: row.id,
      kind: row.kind === "transfer" || row.kind === "income" ? row.kind : "expense",
      title: row.title,
      amount: row.amount,
      note: row.note,
      payerParticipantId: row.payerParticipantId,
      splitMode:
        row.splitMode === "shares" || row.splitMode === "amount" ? row.splitMode : "equal",
      splitParticipantIds: splits.map((split) => split.participantId),
      splits: splits.map((split) => ({
        participantId: split.participantId,
        amount: split.amount,
        weight: split.weight,
      })),
      createdAt: row.createdAt,
    };
  });

  const balances = calculateBalances(
    participantIds,
    expenseRows.map((row) => ({
      payerParticipantId: row.payerParticipantId,
      amount: row.amount,
      kind: row.kind === "income" ? "income" : row.kind === "transfer" ? "transfer" : "expense",
      shares: (splitsByExpenseId.get(row.id) || []).map((split) => ({
        participantId: split.participantId,
        amount: split.amount,
      })),
    })),
  );

  // Khoan tra no (kind = "transfer") khong tinh vao tong chi cua nhom.
  // Khoan thu (kind = "income") tru vao tong chi: phan anh dung so tien
  // nhom thuc su da tieu (vd. hoan tien lam giam tong chi thuc te).
  const totalExpense = expenseRows.reduce((total, row) => {
    if (row.kind === "transfer") return total;
    return row.kind === "income" ? total - row.amount : total + row.amount;
  }, 0);

  const summary: ApiSummary = {
    totalExpense,
    balances,
    settlements: calculateSettlements(balances),
  };

  return { participants, expenses, summary };
}

export async function loadShareLink(
  repo: GameRepository,
  gameId: string,
): Promise<ApiShareLink | null> {
  const link = await repo.shareLinks.getLatestByGame(gameId);
  return link ? { token: link.token, enabled: link.enabled } : null;
}

export async function loadGameDetail(
  repo: GameRepository,
  game: GameRow,
): Promise<ApiGameDetail> {
  const [data, shareLink] = await Promise.all([
    loadGameData(repo, game.id),
    loadShareLink(repo, game.id),
  ]);

  return {
    id: game.id,
    code: game.code,
    name: game.name,
    settlementMode: toSettlementMode(game.settlementMode),
    createdAt: game.createdAt,
    shareLink,
    ...data,
  };
}

export async function loadShareView(repo: GameRepository, game: GameRow): Promise<ApiShareView> {
  const data = await loadGameData(repo, game.id);

  return {
    code: game.code,
    name: game.name,
    settlementMode: toSettlementMode(game.settlementMode),
    ...data,
  };
}

/** Policy so huu: chi chu cuoc choi duoc thao tac. */
export async function getOwnedGame(repo: GameRepository, gameId: string, userId: string) {
  const game = await repo.games.getById(gameId);
  if (!game || game.ownerUserId !== userId) return null;
  return game;
}
