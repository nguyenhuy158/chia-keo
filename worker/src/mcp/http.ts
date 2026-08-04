import { authenticateMcpToken } from "../core/application/mcp-tokens";
import type { GameRepository } from "../core/ports/game-repository";
import { handleMcpMessage, JSON_RPC_ERROR, type McpServerInfo } from "./protocol";
import { mcpTools } from "./tools";

export const MCP_SERVER_INFO: McpServerInfo = {
  name: "chia-keo",
  title: "Chia Kèo",
  version: "1.0.0",
  instructions:
    "Đọc dữ liệu chia tiền nhóm từ Chia Kèo. Gọi list_games trước để lấy mã cuộc chia, " +
    "rồi dùng get_game cho dữ liệu thô hoặc get_summary_text cho bản tổng kết đã định dạng. " +
    "Danh sách tool phụ thuộc quyền của token đang dùng; các tool chỉ đọc, không sửa dữ liệu.",
};

function readBearerToken(header: string | null) {
  if (!header) return "";
  const [scheme, ...rest] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? rest.join(" ").trim() : "";
}

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function unauthorized() {
  // Chi noi phai gui bearer token, khong he token sai o dau.
  return json({ error: "unauthorized" }, 401, {
    "WWW-Authenticate": 'Bearer realm="chia-keo-mcp"',
  });
}

/**
 * Toan bo endpoint MCP, tach khoi Hono de test duoc voi mot GameRepository gia
 * thay vi phai dung D1 that.
 */
export async function handleMcpHttpRequest(options: {
  request: Request;
  repo: GameRepository;
  /** Cho phep ghi lastUsedAt sau khi da tra loi; thieu thi ghi dong bo. */
  waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<Response> {
  const { request, repo, waitUntil } = options;

  const secret = readBearerToken(request.headers.get("Authorization"));
  if (!secret) return unauthorized();

  const identity = await authenticateMcpToken(repo, secret);
  if (!identity) return unauthorized();

  // GET/DELETE la phan SSE + session cua Streamable HTTP; server nay stateless
  // nen tra 405 kem Allow de client biet chi POST duoc.
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  }

  const body = await request.json().catch(() => undefined);
  if (body === undefined) {
    return json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: JSON_RPC_ERROR.parse, message: "Body không phải JSON" },
      },
      400,
    );
  }

  // Ghi lastUsedAt khong duoc lam vo cau tra loi, va o moi truong that thi day
  // sang waitUntil de khong cong luot ghi D1 vao do tre cua request.
  const touch = repo.mcpTokens
    .touchLastUsed(identity.tokenId, new Date().toISOString())
    .catch((error) => console.error("Không ghi được lastUsedAt cho token MCP:", error));
  if (waitUntil) waitUntil(touch);
  else await touch;

  const messageOptions = {
    tools: mcpTools,
    scopes: identity.scopes,
    context: {
      repo,
      userId: identity.userId,
      appOrigin: new URL(request.url).origin,
    },
    serverInfo: MCP_SERVER_INFO,
  };

  // Ban 2025-03-26 cho phep gui mang nhieu message mot luot; ban moi bo di
  // nhung van nhan de client cu khong bi vo.
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((message) => handleMcpMessage(message, messageOptions)),
    );
    const answered = responses.filter((response) => response !== null);
    return answered.length === 0 ? new Response(null, { status: 202 }) : json(answered, 200);
  }

  const response = await handleMcpMessage(body, messageOptions);
  // Notification khong co phan hoi: 202 la dung theo spec.
  return response === null ? new Response(null, { status: 202 }) : json(response, 200);
}
