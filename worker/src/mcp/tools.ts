import type { ApiGameDetail, ApiShareView } from "../../../shared/api-types";
import type { McpScope } from "../../../shared/schemas";
import {
  buildSummaryText,
  type SummaryTextInput,
  type SummaryVariant,
} from "../../../shared/summary-text";
import { getGameDetailForOwner, listGames } from "../core/application/games";
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
  const wanted = ref.toLowerCase();
  const match = games.find(
    (game) => game.id === ref || game.code.toLowerCase() === wanted,
  );

  if (!match) {
    const known = games.map((game) => game.code).join(", ") || "(chưa có cuộc chia nào)";
    throw new Error(`Không tìm thấy cuộc chia "${ref}". Các mã đang có: ${known}`);
  }

  return getGameDetailForOwner(context.repo, context.userId, match.id);
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
