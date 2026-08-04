import type { ApiGame, ApiGameDetail, ApiShareView } from "../../../shared/api-types";
import type { McpScope } from "../../../shared/schemas";
import {
  buildSummaryText,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../../shared/summary-text";
import {
  getBalancesAcrossGames,
  MAX_CROSS_GAME_GAMES,
} from "../core/application/cross-game-balances";
import { findGameByRef, getGameDetailForOwner, listGames } from "../core/application/games";
import { getShareViewByToken } from "../core/application/share-links";
import type { GameRepository } from "../core/ports/game-repository";
import type { McpTool } from "./protocol";

export type McpContext = {
  repo: GameRepository;
  /** Chu cua token dang goi; moi tool doc du lieu deu gioi han trong nguoi nay. */
  userId: string;
  /** Origin cua request, de ghep link share vao ban tom tat. */
  appOrigin: string;
};

const SUMMARY_VARIANTS: SummaryVariant[] = ["compact", "detailed"];

const GAME_REF_SCHEMA = {
  type: "object",
  properties: {
    game: {
      type: "string",
      description: 'Mã cuộc chia (ví dụ "DSKVUF") hoặc id đầy đủ (game_...).',
    },
  },
  required: ["game"],
  additionalProperties: false,
} as const;

function readString(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Thiếu tham số "${key}"`);
  }

  return value.trim();
}

function readVariant(args: Record<string, unknown>): SummaryVariant {
  const value = args.variant;
  if (value === undefined) return "compact";
  if (typeof value === "string" && SUMMARY_VARIANTS.includes(value as SummaryVariant)) {
    return value as SummaryVariant;
  }

  throw new Error(`variant phải là một trong: ${SUMMARY_VARIANTS.join(", ")}`);
}

/**
 * Nhan ca ma cuoc chia va id: model thuong chi thay ma (in tren the tom tat)
 * chu khong biet id. Doi chieu ma khong phan biet hoa thuong.
 */
async function loadGame(context: McpContext, ref: string): Promise<ApiGameDetail> {
  const games = await listGames(context.repo, context.userId);
  const match = findGameByRef(games, ref);
  if (!match) throw new Error(describeMissingGame(games, ref));

  return getGameDetailForOwner(context.repo, context.userId, match.id);
}

/** Kem danh sach ma dang co: model doan lai duoc thay vi bao "khong tim thay". */
function describeMissingGame(games: ApiGame[], ref: string) {
  const known = games.map((game) => game.code).join(", ") || "(chưa có cuộc chia nào)";
  return `Không tìm thấy cuộc chia "${ref}". Các mã đang có: ${known}`;
}

/** Doi danh sach ma/id thanh gameId, bao loi model doc duoc neu co ma sai. */
async function resolveGameIds(context: McpContext, refs: string[]) {
  const games = await listGames(context.repo, context.userId);

  return refs.map((ref) => {
    const match = findGameByRef(games, ref);
    if (!match) throw new Error(describeMissingGame(games, ref));
    return match.id;
  });
}

function readGameRefs(args: Record<string, unknown>): string[] {
  const value = args.games;
  if (value === undefined) return [];

  if (!Array.isArray(value) || value.some((ref) => typeof ref !== "string")) {
    throw new Error('"games" phải là mảng mã cuộc chia, ví dụ ["DSKVUF", "QZDHUD"]');
  }

  const refs = (value as string[]).map((ref) => ref.trim()).filter((ref) => ref !== "");
  if (refs.length > MAX_CROSS_GAME_GAMES) {
    throw new Error(
      `Gộp tối đa ${MAX_CROSS_GAME_GAMES} cuộc chia một lượt, đang truyền ${refs.length}.`,
    );
  }

  return refs;
}

function toSummaryInput(
  game: ApiGameDetail | ApiShareView,
  appOrigin: string,
): SummaryTextInput {
  const shareLink = "shareLink" in game ? game.shareLink : null;

  return {
    code: game.code,
    name: game.name,
    participants: game.participants,
    expenses: game.expenses,
    summary: game.summary,
    settlementMode: game.settlementMode,
    shareUrl:
      shareLink?.enabled && shareLink.token
        ? `${appOrigin}/share/${shareLink.token}`
        : undefined,
  };
}

export const mcpTools: McpTool<McpContext, McpScope>[] = [
  {
    name: "list_games",
    title: "Danh sách cuộc chia",
    description:
      "Liệt kê mọi cuộc chia tiền của chủ tài khoản, kèm mã, số người và số khoản chi. " +
      "Dùng tool này trước để lấy mã, rồi truyền mã đó cho các tool khác.",
    scope: "games:read",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (_args, context) => listGames(context.repo, context.userId),
  },
  {
    name: "get_game",
    title: "Chi tiết cuộc chia",
    description:
      "Toàn bộ dữ liệu một cuộc chia: người tham gia, từng khoản chi kèm cách chia, " +
      "tổng chi, số dư từng người và danh sách ai cần chuyển cho ai. Tra theo mã hoặc id.",
    scope: "games:read",
    inputSchema: GAME_REF_SCHEMA,
    run: async (args, context) => loadGame(context, readString(args, "game")),
  },
  {
    name: "get_summary_text",
    title: "Bản tổng kết dạng chữ",
    description:
      "Bản tổng kết đã định dạng sẵn để dán vào chat, giống hệt nút Copy trong app. " +
      'variant "compact" là bản ngắn, "detailed" ghi thêm ai đã ứng bao nhiêu và ai nhận lại.',
    scope: "summary:read",
    inputSchema: {
      type: "object",
      properties: {
        game: GAME_REF_SCHEMA.properties.game,
        variant: {
          type: "string",
          enum: SUMMARY_VARIANTS,
          description: 'Mặc định "compact".',
        },
      },
      required: ["game"],
      additionalProperties: false,
    },
    run: async (args, context) => {
      const game = await loadGame(context, readString(args, "game"));
      return buildSummaryText(toSummaryInput(game, context.appOrigin), readVariant(args));
    },
  },
  {
    name: "get_balances_across_games",
    title: "Số dư gộp nhiều cuộc chia",
    description:
      "Gộp số dư của nhiều cuộc chia lại theo từng người, rồi tính một bộ chuyển tiền " +
      "duy nhất để tất toán tất cả một lượt. Dùng khi cần biết tổng cộng ai còn nợ ai " +
      "qua nhiều cuộc, thay vì gọi get_game từng cuộc rồi tự cộng. " +
      `Bỏ trống "games" thì lấy ${MAX_CROSS_GAME_GAMES} cuộc gần nhất. ` +
      "Người được đối chiếu giữa các cuộc bằng tên, nên chỉ gộp những cuộc mà cùng nhóm " +
      "người đó thật sự muốn tất toán chung — gộp hai nhóm không liên quan thì con số " +
      "vẫn ra nhưng vô nghĩa.",
    scope: "games:read",
    inputSchema: {
      type: "object",
      properties: {
        games: {
          type: "array",
          items: { type: "string" },
          maxItems: MAX_CROSS_GAME_GAMES,
          description:
            'Mã (hoặc id) các cuộc chia cần gộp, ví dụ ["DSKVUF", "QZDHUD"]. ' +
            `Bỏ trống = ${MAX_CROSS_GAME_GAMES} cuộc gần nhất.`,
        },
      },
      additionalProperties: false,
    },
    run: async (args, context) => {
      const refs = readGameRefs(args);
      return getBalancesAcrossGames(context.repo, context.userId, {
        gameIds: refs.length > 0 ? await resolveGameIds(context, refs) : undefined,
      });
    },
  },
  {
    name: "get_shared_game",
    title: "Cuộc chia qua link share",
    description:
      "Đọc một cuộc chia bằng token trong link share (phần sau /share/ trong URL). " +
      "Không cần quyền chủ sở hữu, dùng được cho cuộc chia của người khác đã bật link share.",
    scope: "share:read",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token trong link, phần sau /share/." },
      },
      required: ["token"],
      additionalProperties: false,
    },
    run: async (args, context) =>
      getShareViewByToken(context.repo, readString(args, "token")),
  },
];
