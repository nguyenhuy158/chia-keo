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
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
};

export const participants: ParticipantRow[] = ["Huy", "Hường", "Hồng"].map((name, index) => ({
  id: `p${index}`,
  gameId: game.id,
  name,
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
  overrides: { shareLink?: ShareLinkRow | null; tokens?: McpTokenRow[] } = {},
): GameRepository {
  const link = overrides.shareLink === undefined ? shareLink : overrides.shareLink;
  const tokens = overrides.tokens || [];
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
      listByOwner: async (userId) => (userId === OWNER ? [game] : []),
      countParticipants: async () => new Map([[game.id, participants.length]]),
      countExpenses: async () => new Map([[game.id, 1]]),
      getById: async (gameId) => (gameId === game.id ? game : null),
      insert: unused("games.insert"),
      update: unused("games.update"),
      delete: unused("games.delete"),
    },
    participants: {
      listByGame: async () => participants,
      listIdsByGame: unused("participants.listIdsByGame"),
      getWithGame: unused("participants.getWithGame"),
      insert: unused("participants.insert"),
      rename: unused("participants.rename"),
      upsertPaymentProfile: unused("participants.upsertPaymentProfile"),
      delete: unused("participants.delete"),
    },
    paymentProfiles: { listByParticipantIds: async () => [] },
    expenses: {
      listByGame: async () => [expenseRow],
      getById: unused("expenses.getById"),
      getWithGame: unused("expenses.getWithGame"),
      insert: unused("expenses.insert"),
      update: unused("expenses.update"),
      delete: unused("expenses.delete"),
      listIdsSplitWith: unused("expenses.listIdsSplitWith"),
    },
    splits: {
      listByExpenseIds: async () => splitRows,
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
  };
}
