import { MCP_SCOPES, type McpScope } from "../../../shared/schemas";
import { allocateAmount } from "../../../shared/split";
import type {
  ExpenseRow,
  ExpenseSplitRow,
  GameRepository,
  GameRow,
  McpTokenRow,
  ParticipantRow,
  ShareLinkRow,
} from "../core/ports/game-repository";

/**
 * Fixture dung chung cho cac test cua MCP. De rieng khoi file .test.ts vi
 * vitest coi moi file .test.ts la mot suite: import fixture tu trong mot suite
 * khac se lam suite do chay lai lan nua.
 */
export const OWNER = "user-1";
export const APP_ORIGIN = "https://chiakeo.test";
export const ALL_SCOPES: McpScope[] = [...MCP_SCOPES];

export const game: GameRow = {
  id: "game_1",
  ownerUserId: OWNER,
  code: "DSKVUF",
  name: "ăn chơi 4/8",
  settlementMode: "host",
  settlementHostId: "",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  deletedAt: null,
};

export const participants: ParticipantRow[] = ["Huy", "Hường", "Hồng"].map((name, index) => ({
  id: `p${index}`,
  gameId: game.id,
  name,
  sequence: index,
  createdAt: game.createdAt,
  updatedAt: game.createdAt,
}));

const expenseRow: ExpenseRow = {
  id: "e0",
  gameId: game.id,
  payerParticipantId: "p2",
  kind: "expense",
  title: "Lẩu bò",
  amount: 300_000,
  note: "",
  splitMode: "equal",
  sequence: 1,
  createdAt: game.createdAt,
  updatedAt: game.createdAt,
};

const splitRows: ExpenseSplitRow[] = allocateAmount(
  expenseRow.amount,
  participants.map((row) => row.id),
).map((share) => ({
  expenseId: expenseRow.id,
  participantId: share.participantId,
  amount: share.amount,
  weight: null,
}));

/**
 * Cuoc chia thu hai, chi bat khi test can gop nhieu cuoc. "Huy" va "Hường" co o
 * ca hai cuoc de kiem tra viec doi chieu nguoi theo ten; "Hồng" va "Nam" moi
 * nguoi chi o mot cuoc.
 */
export const secondGame: GameRow = {
  id: "game_2",
  ownerUserId: OWNER,
  code: "QZDHUD",
  name: "cầu lông",
  settlementMode: "host",
  settlementHostId: "",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  deletedAt: null,
};

export const secondParticipants: ParticipantRow[] = ["Huy", "Hường", "Nam"].map(
  (name, index) => ({
    id: `q${index}`,
    gameId: secondGame.id,
    name,
    sequence: index,
    createdAt: secondGame.createdAt,
    updatedAt: secondGame.createdAt,
  }),
);

/** Huy ung 300k, chia deu ba nguoi: Huy +200k, Hường -100k, Nam -100k. */
const secondExpenseRow: ExpenseRow = {
  id: "e1",
  gameId: secondGame.id,
  payerParticipantId: "q0",
  kind: "expense",
  title: "Sân",
  amount: 300_000,
  note: "",
  splitMode: "equal",
  sequence: 1,
  createdAt: secondGame.createdAt,
  updatedAt: secondGame.createdAt,
};

const secondSplitRows: ExpenseSplitRow[] = allocateAmount(
  secondExpenseRow.amount,
  secondParticipants.map((row) => row.id),
).map((share) => ({
  expenseId: secondExpenseRow.id,
  participantId: share.participantId,
  amount: share.amount,
  weight: null,
}));

export const shareLink: ShareLinkRow = {
  gameId: game.id,
  token: "tok3n",
  enabled: true,
  createdAt: game.createdAt,
  expiresAt: null,
};

/**
 * Chi implement nhung method ma cac tool MCP that su goi; phan con lai nem loi
 * de test do luon neu tool bat dau cham vao cho khong mong doi.
 */
export function fakeRepo(
  overrides: {
    shareLink?: ShareLinkRow | null;
    tokens?: McpTokenRow[];
    /** Bat cuoc chia thu hai; mac dinh tat de test cu thay dung mot cuoc. */
    twoGames?: boolean;
  } = {},
): GameRepository {
  const link = overrides.shareLink === undefined ? shareLink : overrides.shareLink;
  const tokens = overrides.tokens || [];
  const games = overrides.twoGames ? [game, secondGame] : [game];
  const unused = (name: string) => () => {
    throw new Error(`Tool MCP không được gọi ${name}`);
  };

  return {
    mcpTokens: {
      listByUser: async (userId) => tokens.filter((token) => token.userId === userId),
      countActiveByUser: async (userId) =>
        tokens.filter((token) => token.userId === userId && !token.revokedAt).length,
      findByHash: async (hash) =>
        tokens.find((token) => token.tokenHash === hash) || null,
      insert: async (row) => {
        tokens.push(row);
      },
      revoke: async (tokenId, userId, revokedAt) => {
        const found = tokens.find(
          (token) => token.id === tokenId && token.userId === userId && !token.revokedAt,
        );
        if (!found) return false;
        found.revokedAt = revokedAt;
        return true;
      },
      touchLastUsed: async (tokenId, lastUsedAt) => {
        const found = tokens.find((token) => token.id === tokenId);
        if (found) found.lastUsedAt = lastUsedAt;
      },
    },
    games: {
      // Moi nhat truoc, giong adapter D1 that (order by createdAt desc).
      listByOwner: async (userId) => (userId === OWNER ? games : []),
      countParticipants: async () =>
        new Map([
          [game.id, participants.length],
          [secondGame.id, secondParticipants.length],
        ]),
      countExpenses: async () =>
        new Map([
          [game.id, 1],
          [secondGame.id, 1],
        ]),
      getById: async (gameId) => games.find((row) => row.id === gameId) || null,
      listDeletedByOwner: async () => [],
      listSharedWithUser: async () => [],
      insert: unused("games.insert"),
      update: unused("games.update"),
      setDeletedAt: unused("games.setDeletedAt"),
      delete: unused("games.delete"),
    },
    participants: {
      listByGame: async (gameId) =>
        gameId === secondGame.id ? secondParticipants : participants,
      listIdsByGame: unused("participants.listIdsByGame"),
      listByOwner: unused("participants.listByOwner"),
      listIdNamesByOwner: unused("participants.listIdNamesByOwner"),
      getWithGame: unused("participants.getWithGame"),
      insert: unused("participants.insert"),
      rename: unused("participants.rename"),
      reorder: unused("participants.reorder"),
      upsertPaymentProfile: unused("participants.upsertPaymentProfile"),
      delete: unused("participants.delete"),
    },
    paymentProfiles: { listByParticipantIds: async () => [] },
    userPreferences: {
      listByUser: async () => [],
      upsert: unused("userPreferences.upsert"),
    },
    contacts: {
      listByOwner: async () => [],
      getOwned: unused("contacts.getOwned"),
      upsert: unused("contacts.upsert"),
      update: unused("contacts.update"),
      delete: unused("contacts.delete"),
    },
    gameEvents: {
      listByGame: async () => [],
      getWithGame: unused("gameEvents.getWithGame"),
      // MCP chi doc; ghi lich su la viec cua cac mutation qua HTTP.
      insert: async () => {},
      markUndone: unused("gameEvents.markUndone"),
    },
    expenses: {
      listByGame: async (gameId) =>
        gameId === secondGame.id ? [secondExpenseRow] : [expenseRow],
      getById: unused("expenses.getById"),
      getWithGame: unused("expenses.getWithGame"),
      insert: unused("expenses.insert"),
      update: unused("expenses.update"),
      delete: unused("expenses.delete"),
      listIdsSplitWith: unused("expenses.listIdsSplitWith"),
      listByGameIds: unused("expenses.listByGameIds"),
      reorder: unused("expenses.reorder"),
    },
    splits: {
      listByExpenseIds: async (expenseIds) =>
        [...splitRows, ...secondSplitRows].filter((row) =>
          expenseIds.includes(row.expenseId),
        ),
      listByExpense: unused("splits.listByExpense"),
      listLiveByExpense: unused("splits.listLiveByExpense"),
      replace: unused("splits.replace"),
    },
    photos: {
      listByGame: unused("photos.listByGame"),
      countByGame: unused("photos.countByGame"),
      getById: unused("photos.getById"),
      getWithGame: unused("photos.getWithGame"),
      getDetail: unused("photos.getDetail"),
      insert: unused("photos.insert"),
      update: unused("photos.update"),
      delete: unused("photos.delete"),
    },
    shareLinks: {
      getLatestByGame: async () => link,
      replace: unused("shareLinks.replace"),
      setEnabled: unused("shareLinks.setEnabled"),
      findByToken: async (token) =>
        link && token === link.token ? { link, game } : null,
    },
    users: {
      findIdByEmail: unused("users.findIdByEmail"),
      listAllExceptOwner: unused("users.listAllExceptOwner"),
      updateName: unused("users.updateName"),
    },
    gameCollaborators: {
      listByGame: async () => [],
      isCollaborator: async () => false,
      add: unused("gameCollaborators.add"),
      remove: unused("gameCollaborators.remove"),
      resolvePendingByEmail: unused("gameCollaborators.resolvePendingByEmail"),
    },
  };
}
