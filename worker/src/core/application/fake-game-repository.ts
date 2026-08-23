// Repository trong bo nho dung cho test use case: cai dat du phan cac use case
// ve khoan chi / nguoi tham gia cham toi, giu dung ngu nghia cua adapter D1
// (sequence, cascade khi xoa, split chi tinh nguoi con song).

import type {
  CollaboratorRow,
  ExpenseRow,
  ExpenseSplitRow,
  ExpenseUpdate,
  GameEventRow,
  GameRepository,
  GameRow,
  NewSplitRow,
  ParticipantRow,
  PaymentProfileRow,
  ShareLinkRow,
  ShuttleEntryRow,
} from "../ports/game-repository";

const OWNER_USER_ID = "user_owner";
const DEFAULT_GAME_ID = "game_1";

export type FakeState = {
  games: GameRow[];
  participants: ParticipantRow[];
  payments: PaymentProfileRow[];
  expenses: ExpenseRow[];
  splits: ExpenseSplitRow[];
  events: GameEventRow[];
  collaborators: CollaboratorRow[];
  shareLinks: ShareLinkRow[];
  shuttleEntries: ShuttleEntryRow[];
  users: { id: string; name: string; email: string }[];
};

export function gameRow(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: DEFAULT_GAME_ID,
    ownerUserId: OWNER_USER_ID,
    code: "DSKVUF",
    name: "Cầu lông",
    settlementMode: "host",
    settlementHostId: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

export function participantRow(
  id: string,
  name: string,
  overrides: Partial<ParticipantRow> = {},
): ParticipantRow {
  return {
    id,
    gameId: DEFAULT_GAME_ID,
    name,
    sequence: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

export const FAKE_OWNER = OWNER_USER_ID;
export const FAKE_GAME_ID = DEFAULT_GAME_ID;

function emptyState(): FakeState {
  return {
    games: [gameRow()],
    participants: [],
    payments: [],
    expenses: [],
    splits: [],
    events: [],
    collaborators: [],
    shareLinks: [],
    shuttleEntries: [],
    users: [],
  };
}

/**
 * Tao repo gia + state de assert truc tiep. Tra ve ca `state` de test doc
 * duoc so lieu da ghi thay vi phai goi lai use case chi de kiem tra.
 */
export function createFakeRepo(initial: Partial<FakeState> = {}) {
  const state: FakeState = { ...emptyState(), ...initial };

  const findGame = (gameId: string) => state.games.find((row) => row.id === gameId) || null;

  const repo: GameRepository = {
    games: {
      listByOwner: async (userId) =>
        state.games.filter((row) => row.ownerUserId === userId && !row.deletedAt),
      listSharedWithUser: async () => [],
      listDeletedByOwner: async (userId) =>
        state.games.filter((row) => row.ownerUserId === userId && row.deletedAt),
      countParticipants: async () => new Map(),
      countExpenses: async () => new Map(),
      insert: async (row) => {
        state.games.push(row);
      },
      getById: async (gameId) => findGame(gameId),
      update: async (gameId, changes, updatedAt) => {
        const game = findGame(gameId);
        if (game) Object.assign(game, changes, { updatedAt });
      },
      setDeletedAt: async (gameId, deletedAt) => {
        const game = findGame(gameId);
        if (game) game.deletedAt = deletedAt;
      },
      delete: async (gameId) => {
        state.games = state.games.filter((row) => row.id !== gameId);
      },
    },
    participants: {
      listByGame: async (gameId) =>
        state.participants
          .filter((row) => row.gameId === gameId)
          .sort((left, right) => left.sequence - right.sequence),
      listIdsByGame: async (gameId) =>
        state.participants.filter((row) => row.gameId === gameId).map((row) => row.id),
      getWithGame: async (participantId) => {
        const participant = state.participants.find((row) => row.id === participantId);
        const game = participant ? findGame(participant.gameId) : null;
        return participant && game ? { participant, game } : null;
      },
      insert: async (row, payment) => {
        const sequence = state.participants.filter((item) => item.gameId === row.gameId).length;
        state.participants.push({ ...row, sequence });
        state.payments.push({ participantId: row.id, ...payment });
      },
      rename: async (participantId, name, updatedAt) => {
        const participant = state.participants.find((row) => row.id === participantId);
        if (participant) Object.assign(participant, { name, updatedAt });
      },
      reorder: async (gameId, orderedIds) => {
        for (const [index, id] of orderedIds.entries()) {
          const participant = state.participants.find(
            (row) => row.id === id && row.gameId === gameId,
          );
          if (participant) participant.sequence = index;
        }
      },
      upsertPaymentProfile: async (participantId, fields) => {
        const existing = state.payments.find((row) => row.participantId === participantId);
        if (existing) Object.assign(existing, fields);
        else
          state.payments.push({
            participantId,
            bankId: "",
            accountNo: "",
            accountName: "",
            ...fields,
          });
      },
      delete: async (participantId) => {
        state.participants = state.participants.filter((row) => row.id !== participantId);
        state.payments = state.payments.filter((row) => row.participantId !== participantId);
        // Cascade nhu FK trong D1: split cua nguoi da xoa bien mat.
        state.splits = state.splits.filter((row) => row.participantId !== participantId);
      },
      listByOwner: async () => [],
      listIdNamesByOwner: async () => [],
    },
    paymentProfiles: {
      listByParticipantIds: async (participantIds) =>
        state.payments.filter((row) => participantIds.includes(row.participantId)),
    },
    expenses: {
      listByGame: async (gameId) =>
        state.expenses
          .filter((row) => row.gameId === gameId)
          .sort((left, right) => right.sequence - left.sequence),
      getById: async (expenseId) => state.expenses.find((row) => row.id === expenseId) || null,
      getWithGame: async (expenseId) => {
        const expense = state.expenses.find((row) => row.id === expenseId);
        const game = expense ? findGame(expense.gameId) : null;
        return expense && game ? { expense, game } : null;
      },
      insert: async (row) => {
        const sequence = state.expenses.filter((item) => item.gameId === row.gameId).length;
        state.expenses.push({ ...row, sequence });
      },
      update: async (expenseId: string, fields: ExpenseUpdate) => {
        const expense = state.expenses.find((row) => row.id === expenseId);
        if (expense) Object.assign(expense, fields);
      },
      delete: async (expenseId) => {
        state.expenses = state.expenses.filter((row) => row.id !== expenseId);
        state.splits = state.splits.filter((row) => row.expenseId !== expenseId);
      },
      listIdsSplitWith: async (participantId) => [
        ...new Set(
          state.splits
            .filter((row) => row.participantId === participantId)
            .map((row) => row.expenseId),
        ),
      ],
      listByGameIds: async (gameIds) =>
        state.expenses.filter((row) => gameIds.includes(row.gameId)),
      reorder: async (gameId, orderedIds) => {
        const top = orderedIds.length;
        for (const [index, id] of orderedIds.entries()) {
          const expense = state.expenses.find((row) => row.id === id && row.gameId === gameId);
          if (expense) expense.sequence = top - index;
        }
      },
    },
    splits: {
      listByExpenseIds: async (expenseIds) =>
        state.splits.filter((row) => expenseIds.includes(row.expenseId)),
      listByExpense: async (expenseId) =>
        state.splits.filter((row) => row.expenseId === expenseId),
      listLiveByExpense: async (expenseId) => {
        const liveIds = new Set(state.participants.map((row) => row.id));
        return state.splits.filter(
          (row) => row.expenseId === expenseId && liveIds.has(row.participantId),
        );
      },
      replace: async (expenseId: string, rows: NewSplitRow[]) => {
        state.splits = state.splits.filter((row) => row.expenseId !== expenseId);
        for (const row of rows) {
          state.splits.push({
            expenseId: row.expenseId,
            participantId: row.participantId,
            amount: row.amount,
            weight: row.weight,
          });
        }
      },
    },
    photos: {
      listByGame: async () => [],
      countByGame: async () => 0,
      getById: async () => null,
      getWithGame: async () => null,
      getDetail: async () => null,
      insert: async () => {},
      update: async () => {},
      delete: async () => {},
    },
    mcpTokens: {
      listByUser: async () => [],
      countActiveByUser: async () => 0,
      findByHash: async () => null,
      insert: async () => {},
      revoke: async () => false,
      touchLastUsed: async () => {},
    },
    userPreferences: {
      listByUser: async () => [],
      upsert: async () => {},
    },
    shuttleEntries: {
      listByOwner: async (userId) =>
        state.shuttleEntries
          .filter((row) => row.ownerUserId === userId)
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      getOwned: async (entryId, userId) =>
        state.shuttleEntries.find(
          (row) => row.id === entryId && row.ownerUserId === userId,
        ) || null,
      insert: async (row) => {
        state.shuttleEntries.push(row);
      },
      delete: async (entryId) => {
        state.shuttleEntries = state.shuttleEntries.filter((row) => row.id !== entryId);
      },
    },
    contacts: {
      listByOwner: async () => [],
      getOwned: async () => null,
      upsert: async () => {},
      update: async () => {},
      delete: async () => {},
    },
    gameEvents: {
      listByGame: async (gameId, limit) =>
        state.events.filter((row) => row.gameId === gameId).slice(0, limit),
      getWithGame: async (eventId) => {
        const event = state.events.find((row) => row.id === eventId);
        const game = event ? findGame(event.gameId) : null;
        return event && game ? { event, game } : null;
      },
      insert: async (row) => {
        state.events.unshift(row);
      },
      markUndone: async (eventId, undoneAt) => {
        const event = state.events.find((row) => row.id === eventId);
        if (event) event.undoneAt = undoneAt;
      },
    },
    shareLinks: {
      getLatestByGame: async (gameId) =>
        state.shareLinks.find((row) => row.gameId === gameId) || null,
      replace: async (gameId, row) => {
        state.shareLinks = state.shareLinks.filter((item) => item.gameId !== gameId);
        state.shareLinks.push({
          gameId: row.gameId,
          token: row.token,
          enabled: row.enabled,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
        });
      },
      setEnabled: async (gameId, enabled) => {
        const link = state.shareLinks.find((row) => row.gameId === gameId);
        if (link) link.enabled = enabled;
      },
      findByToken: async (token) => {
        const link = state.shareLinks.find((row) => row.token === token);
        const game = link ? findGame(link.gameId) : null;
        return link && game ? { link, game } : null;
      },
    },
    users: {
      findIdByEmail: async (email) =>
        state.users.find((row) => row.email.toLowerCase() === email.toLowerCase()) || null,
      listAllExceptOwner: async (ownerUserId) =>
        state.users.filter((row) => row.id !== ownerUserId),
      updateName: async (userId, name) => {
        const user = state.users.find((row) => row.id === userId);
        if (user) user.name = name;
      },
    },
    gameCollaborators: {
      listByGame: async (gameId) => state.collaborators.filter((row) => row.gameId === gameId),
      isCollaborator: async (gameId, userId) =>
        state.collaborators.some((row) => row.gameId === gameId && row.userId === userId),
      add: async (row) => {
        const duplicated = state.collaborators.some(
          (item) =>
            item.gameId === row.gameId &&
            item.invitedEmail.toLowerCase() === row.invitedEmail.toLowerCase(),
        );
        if (duplicated) return false;

        const user = row.userId ? state.users.find((item) => item.id === row.userId) : null;
        state.collaborators.push({
          ...row,
          name: user?.name || "",
          email: user?.email || row.invitedEmail,
        });
        return true;
      },
      remove: async (gameId, target) => {
        state.collaborators = state.collaborators.filter((row) => {
          if (row.gameId !== gameId) return true;
          if (target.userId) return row.userId !== target.userId;
          if (target.invitedEmail)
            return row.invitedEmail.toLowerCase() !== target.invitedEmail.toLowerCase();
          return true;
        });
      },
      resolvePendingByEmail: async (email, userId) => {
        for (const row of state.collaborators) {
          if (!row.userId && row.invitedEmail.toLowerCase() === email.toLowerCase()) {
            row.userId = userId;
          }
        }
      },
    },
  };

  return { repo, state };
}

/** Split cua mot khoan chi, sap theo participantId de assert on dinh. */
export function splitsOf(state: FakeState, expenseId: string) {
  return state.splits
    .filter((row) => row.expenseId === expenseId)
    .sort((left, right) => left.participantId.localeCompare(right.participantId))
    .map((row) => [row.participantId, row.amount] as const);
}
