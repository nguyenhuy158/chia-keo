import { beforeEach, describe, expect, it } from "vitest";
import type { McpScope } from "../../../shared/schemas";
import { createMcpToken } from "../core/application/mcp-tokens";
import type { GameRepository } from "../core/ports/game-repository";
import { handleMcpHttpRequest } from "./http";
import { fakeRepo } from "./fixtures";

const ENDPOINT = "https://chiakeo.test/api/mcp";

let repo: GameRepository;
let secret: string;
let tokenId: string;

async function issueToken(scopes: McpScope[]) {
  const created = await createMcpToken(repo, "user-1", { name: "Claude Code", scopes });
  return created;
}

beforeEach(async () => {
  repo = fakeRepo({ tokens: [] });
  const created = await issueToken(["games:read", "summary:read", "share:read"]);
  secret = created.secret;
  tokenId = created.token.id;
});

function call(
  body: unknown,
  options: { token?: string | null; method?: string } = {},
) {
  const token = options.token === undefined ? secret : options.token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token !== null) headers.Authorization = `Bearer ${token}`;

  const method = options.method || "POST";
  return handleMcpHttpRequest({
    request: new Request(ENDPOINT, {
      method,
      headers,
      body:
        method === "GET" || body === undefined
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    }),
    repo,
  });
}

describe("handleMcpHttpRequest", () => {
  it("tra 401 khi thieu header, sai scheme, hoac token sai", async () => {
    expect((await call({ jsonrpc: "2.0", id: 1, method: "ping" }, { token: null })).status).toBe(
      401,
    );
    expect(
      (await call({ jsonrpc: "2.0", id: 1, method: "ping" }, { token: "ck_saibet" })).status,
    ).toBe(401);

    const wrongScheme = await handleMcpHttpRequest({
      request: new Request(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Token ${secret}` },
        body: "{}",
      }),
      repo,
    });
    expect(wrongScheme.status).toBe(401);
  });

  it("401 kem WWW-Authenticate va khong he token sai o dau", async () => {
    const response = await call({ jsonrpc: "2.0", id: 1, method: "ping" }, { token: null });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.headers.get("WWW-Authenticate")).toContain("Bearer");
    expect(body).toEqual({ error: "unauthorized" });
  });

  it("tra 405 cho GET vi server stateless, khong mo SSE", async () => {
    const response = await call(undefined, { method: "GET" });

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("kiem tra token truoc khi doc body", async () => {
    const response = await call("{ khong phai json", { token: "ck_saibet" });
    expect(response.status).toBe(401);
  });

  it("bao loi parse khi body khong phai JSON", async () => {
    const response = await call("{ khong phai json");
    const body = (await response.json()) as { error: { code: number } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(-32700);
  });

  it("liet ke tool qua HTTP", async () => {
    const response = await call({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const body = (await response.json()) as { result: { tools: { name: string }[] } };

    expect(response.status).toBe(200);
    expect(body.result.tools.map((tool) => tool.name)).toContain("get_summary_text");
  });

  it("tra 202 khong body cho notification", async () => {
    const response = await call({ jsonrpc: "2.0", method: "notifications/initialized" });

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
  });

  it("nhan batch cua ban spec cu va tra dung so phan hoi", async () => {
    const response = await call([
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ]);
    const body = (await response.json()) as { id: number }[];

    // Notification khong sinh phan hoi nen chi con hai.
    expect(body.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it("ghi lai lan cuoi token duoc dung", async () => {
    const before = (await repo.mcpTokens.listByUser("user-1"))[0];
    expect(before.lastUsedAt).toBeNull();

    await call({ jsonrpc: "2.0", id: 1, method: "ping" });

    const after = (await repo.mcpTokens.listByUser("user-1"))[0];
    expect(after.id).toBe(tokenId);
    expect(after.lastUsedAt).toBeTruthy();
  });

  it("quyen cua token quyet dinh tool nhin thay duoc", async () => {
    const limited = await issueToken(["share:read"]);
    const response = await call(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { token: limited.secret },
    );
    const body = (await response.json()) as { result: { tools: { name: string }[] } };

    // get_version khong doi quyen nen token nao cung thay.
    expect(body.result.tools.map((tool) => tool.name)).toEqual([
      "get_version",
      "get_shared_game",
    ]);
  });

  it("hai token cua hai user doc du lieu cua chinh minh", async () => {
    const other = await createMcpToken(repo, "user-khac", {
      name: "Người khác",
      scopes: ["games:read"],
    });

    const mine = await call({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_games", arguments: {} },
    });
    const theirs = await call(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_games" } },
      { token: other.secret },
    );

    const readGames = async (response: Response) => {
      const body = (await response.json()) as {
        result: { content: { text: string }[] };
      };
      return JSON.parse(body.result.content[0].text) as unknown[];
    };

    expect(await readGames(mine)).toHaveLength(1);
    // fakeRepo chi co cuoc chia cua user-1, nen user khac phai thay rong.
    expect(await readGames(theirs)).toEqual([]);
  });
});
