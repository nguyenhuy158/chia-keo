/**
 * MCP qua Streamable HTTP o che do stateless: moi POST mang mot JSON-RPC
 * message va nhan lai dung mot JSON response. Khong giu session, khong mo SSE.
 *
 * Chon stateless vi API chay tren Pages Functions - khong co Durable Object de
 * giu state giua cac request - va vi cac tool o day chi doc du lieu nen khong
 * can server chu dong day message ve client.
 */

/** Ban spec moi nhat server nay noi duoc. */
export const MCP_PROTOCOL_VERSION = "2025-06-18";

/**
 * Spec: neu server ho tro dung ban client xin thi phai tra lai chinh ban do.
 * Ba ban duoi day khac nhau o phan session/SSE, con initialize + tools/* thi
 * giong nhau, nen deu phuc vu duoc.
 */
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export const JSON_RPC_ERROR = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
} as const;

export type JsonRpcId = string | number;

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/** Mot tool MCP. `Context` la thu tool can de lam viec (repo, user, origin...). */
export type McpTool<Context, Scope extends string = string> = {
  name: string;
  title: string;
  description: string;
  /** Scope token phai co moi goi duoc tool nay. */
  scope: Scope;
  /** JSON Schema cho tham so; de trong object rong neu tool khong nhan gi. */
  inputSchema: Record<string, unknown>;
  run(args: Record<string, unknown>, context: Context): Promise<unknown>;
};

export type McpServerInfo = {
  name: string;
  title: string;
  version: string;
  /** Hien trong client de nguoi dung biet server nay lam gi. */
  instructions: string;
};

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: JsonRpcId | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Loi khi chay tool tra ve trong `result` kem isError chu khong phai loi
 * JSON-RPC: spec muon model doc duoc loi de tu sua, con loi JSON-RPC la danh
 * cho sai o tang giao thuc.
 */
function toolFailure(id: JsonRpcId, message: string): JsonRpcResponse {
  return ok(id, { isError: true, content: [{ type: "text", text: message }] });
}

function textResult(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
}

function negotiateProtocolVersion(params: unknown) {
  const requested = (params as { protocolVersion?: unknown } | null)?.protocolVersion;
  return typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : MCP_PROTOCOL_VERSION;
}

function describeTool<Context>(tool: McpTool<Context>) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}

async function callTool<Context>(
  id: JsonRpcId,
  params: unknown,
  tools: McpTool<Context>[],
  scopes: readonly string[],
  context: Context,
): Promise<JsonRpcResponse> {
  const { name, arguments: args } = (params || {}) as {
    name?: unknown;
    arguments?: unknown;
  };

  if (typeof name !== "string") {
    return fail(id, JSON_RPC_ERROR.invalidParams, "Thiếu tên tool");
  }

  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return fail(id, JSON_RPC_ERROR.methodNotFound, `Không có tool "${name}"`);

  // Noi ro thieu scope nao thay vi bao "khong co tool": ten tool khong phai bi
  // mat, con nguoi dung thi can biet phai tao lai token voi quyen gi.
  if (!scopes.includes(tool.scope)) {
    return toolFailure(
      id,
      `Token này không có quyền "${tool.scope}" nên không gọi được ${tool.name}. ` +
        `Tạo token mới với quyền đó ở trang cài đặt.`,
    );
  }

  try {
    const value = await tool.run((args || {}) as Record<string, unknown>, context);
    return ok(id, textResult(value));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return toolFailure(id, message);
  }
}

/**
 * Xu ly mot JSON-RPC message. Tra ve null voi notification (message khong co
 * `id`) - theo spec thi khong duoc tra ve gi cho notification.
 */
export async function handleMcpMessage<Context>(
  message: unknown,
  options: {
    tools: McpTool<Context>[];
    /** Scope cua token dang goi; tool ngoai danh sach nay bi an va bi chan. */
    scopes: readonly string[];
    context: Context;
    serverInfo: McpServerInfo;
  },
): Promise<JsonRpcResponse | null> {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return fail(null, JSON_RPC_ERROR.invalidRequest, "Message không phải JSON-RPC object");
  }

  const { id, method, params } = message as {
    id?: unknown;
    method?: unknown;
    params?: unknown;
  };

  if (typeof method !== "string") {
    return fail(null, JSON_RPC_ERROR.invalidRequest, "Thiếu method");
  }

  const isNotification = id === undefined || id === null;
  // Notification duy nhat can biet la "da initialize xong"; cac notification
  // khac cung im lang de client khong bi bao loi vi thu.
  if (isNotification) return null;

  const requestId = id as JsonRpcId;
  const { tools, scopes, context, serverInfo } = options;

  switch (method) {
    case "initialize":
      return ok(requestId, {
        protocolVersion: negotiateProtocolVersion(params),
        // Chi khai bao tools: server khong co resources/prompts nao.
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: serverInfo.name,
          title: serverInfo.title,
          version: serverInfo.version,
        },
        instructions: serverInfo.instructions,
      });

    case "ping":
      return ok(requestId, {});

    case "tools/list":
      // Chi liet ke tool trong quyen: model khong nhin thay thu no khong duoc
      // goi, nen khong lang phi luot goi vao tool chac chan bi tu choi.
      return ok(requestId, {
        tools: tools.filter((tool) => scopes.includes(tool.scope)).map(describeTool),
      });

    case "tools/call":
      return callTool(requestId, params, tools, scopes, context);

    default:
      return fail(requestId, JSON_RPC_ERROR.methodNotFound, `Method không hỗ trợ: ${method}`);
  }
}
