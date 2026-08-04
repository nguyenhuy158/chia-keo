import { describe, expect, it } from "vitest";
import { MCP_SCOPES, type McpScope } from "../../../shared/schemas";
import { ALL_SCOPES, APP_ORIGIN, fakeRepo, OWNER, shareLink } from "./fixtures";
import { handleMcpMessage, JSON_RPC_ERROR, MCP_PROTOCOL_VERSION } from "./protocol";
import { mcpTools, type McpContext } from "./tools";

function makeContext(overrides: Partial<McpContext> = {}): McpContext {
  return {
    repo: overrides.repo || fakeRepo(),
    userId: overrides.userId === undefined ? OWNER : overrides.userId,
    appOrigin: overrides.appOrigin || APP_ORIGIN,
  };
}

function send(
  message: unknown,
  options: { context?: McpContext; scopes?: McpScope[] } = {},
) {
  return handleMcpMessage(message, {
    tools: mcpTools,
    scopes: options.scopes || ALL_SCOPES,
    context: options.context || makeContext(),
    serverInfo: {
      name: "chia-keo",
      title: "Chia Kèo",
      version: "1.0.0",
      instructions: "test",
    },
  });
}

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
  options: { context?: McpContext; scopes?: McpScope[] } = {},
) {
  const response = await send(
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
    options,
  );
  return response?.result as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
}

/** Tool tra du lieu duoi dang text JSON; doc lai de assert cho chac. */
function parsed<T>(result: { content: { text: string }[] }): T {
  return JSON.parse(result.content[0].text) as T;
}

describe("MCP protocol", () => {
  it("initialize khai bao capability tools va tra dung ban spec client xin", async () => {
    const response = await send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    });

    const result = response?.result as Record<string, any>;
    expect(result.protocolVersion).toBe("2025-03-26");
    expect(result.capabilities.tools).toBeDefined();
    expect(result.serverInfo.name).toBe("chia-keo");
  });

  it("roi ve ban moi nhat khi client xin ban khong biet", async () => {
    const response = await send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "1999-01-01" },
    });

    expect((response?.result as { protocolVersion: string }).protocolVersion).toBe(
      MCP_PROTOCOL_VERSION,
    );
  });

  it("khong tra loi gi cho notification", async () => {
    expect(await send({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("liet ke du bon tool kem inputSchema", async () => {
    const response = await send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const { tools } = response?.result as { tools: { name: string; inputSchema: unknown }[] };

    expect(tools.map((tool) => tool.name)).toEqual([
      "list_games",
      "get_game",
      "get_summary_text",
      "get_shared_game",
    ]);
    for (const tool of tools) expect(tool.inputSchema).toBeTruthy();
  });

  it("chi liet ke tool trong quyen cua token", async () => {
    const response = await send(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { scopes: ["share:read"] },
    );
    const { tools } = response?.result as { tools: { name: string }[] };

    expect(tools.map((tool) => tool.name)).toEqual(["get_shared_game"]);
  });

  it("chan tool ngoai quyen va noi ro thieu scope nao", async () => {
    const response = await send(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "list_games", arguments: {} },
      },
      { scopes: ["share:read"] },
    );
    const result = response?.result as { isError: boolean; content: { text: string }[] };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("games:read");
  });

  it("token khong scope nao thi khong thay tool nao", async () => {
    const response = await send({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { scopes: [] });
    expect((response?.result as { tools: unknown[] }).tools).toEqual([]);
  });

  it("moi tool khai bao mot scope nam trong danh sach da biet", () => {
    for (const tool of mcpTools) expect(MCP_SCOPES).toContain(tool.scope);
  });

  it("bao method khong ho tro thay vi im lang", async () => {
    const response = await send({ jsonrpc: "2.0", id: 1, method: "resources/list" });
    expect(response?.error?.code).toBe(JSON_RPC_ERROR.methodNotFound);
  });

  it("bao invalidRequest khi message khong phai JSON-RPC", async () => {
    expect((await send("xin chào"))?.error?.code).toBe(JSON_RPC_ERROR.invalidRequest);
    expect((await send({ jsonrpc: "2.0", id: 1 }))?.error?.code).toBe(
      JSON_RPC_ERROR.invalidRequest,
    );
  });

  it("goi tool khong ton tai thi bao methodNotFound", async () => {
    const response = await send({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "delete_everything" },
    });

    expect(response?.error?.code).toBe(JSON_RPC_ERROR.methodNotFound);
  });
});

describe("MCP tools", () => {
  it("list_games tra ma va so lieu dem", async () => {
    const games = parsed<{ code: string; participantCount: number; expenseCount: number }[]>(
      await callTool("list_games"),
    );

    expect(games).toHaveLength(1);
    expect(games[0].code).toBe("DSKVUF");
    expect(games[0].participantCount).toBe(3);
    expect(games[0].expenseCount).toBe(1);
  });

  it("get_game tra du chi tiet va tinh san summary", async () => {
    const detail = parsed<{
      code: string;
      participants: unknown[];
      expenses: unknown[];
      summary: { totalExpense: number; settlements: unknown[] };
    }>(await callTool("get_game", { game: "DSKVUF" }));

    expect(detail.code).toBe("DSKVUF");
    expect(detail.participants).toHaveLength(3);
    expect(detail.summary.totalExpense).toBe(300_000);
    // Hồng ứng 300k, hai người kia mỗi người nợ 100k.
    expect(detail.summary.settlements).toHaveLength(2);
  });

  it("get_game nhan ca ma viet thuong va id", async () => {
    expect((await callTool("get_game", { game: "dskvuf" })).isError).toBeUndefined();
    expect((await callTool("get_game", { game: "game_1" })).isError).toBeUndefined();
  });

  it("get_game bao ma nao dang co khi tra sai", async () => {
    const result = await callTool("get_game", { game: "SAIMA" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("DSKVUF");
  });

  it("get_summary_text dung dung dinh dang cua nut Copy", async () => {
    const compact = (await callTool("get_summary_text", { game: "DSKVUF" })).content[0].text;

    expect(compact).toContain("ăn chơi 4/8 · DSKVUF");
    expect(compact).toContain("CÁC KHOẢN CHI (1 khoản · tổng 300k)");
    expect(compact).toContain("GOM VỀ HỒNG");
    // Link share duoc ghep tu origin cua request.
    expect(compact).toContain(`Chi tiết: ${APP_ORIGIN}/share/tok3n`);
    expect(compact).not.toContain("đã ứng");
  });

  it("get_summary_text ban detailed ghi them so da ung", async () => {
    const detailed = (
      await callTool("get_summary_text", { game: "DSKVUF", variant: "detailed" })
    ).content[0].text;

    expect(detailed).toContain("TỪNG NGƯỜI (phần phải chịu)");
    expect(detailed).toContain("đã ứng 300k → nhận lại 200k");
  });

  it("get_summary_text chan variant la", async () => {
    const result = await callTool("get_summary_text", { game: "DSKVUF", variant: "xyz" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("compact");
  });

  it("bo link share khoi ban tom tat khi link bi tat", async () => {
    const context = makeContext({
      repo: fakeRepo({ shareLink: { ...shareLink, enabled: false } }),
    });
    const text = (await callTool("get_summary_text", { game: "DSKVUF" }, { context }))
      .content[0].text;

    expect(text).not.toContain("Chi tiết:");
  });

  it("get_shared_game doc duoc bang token, khong can quyen chu", async () => {
    const view = parsed<{ code: string; name: string }>(
      await callTool("get_shared_game", { token: "tok3n" }),
    );

    expect(view.code).toBe("DSKVUF");
    expect(view.name).toBe("ăn chơi 4/8");
  });

  it("get_shared_game tu choi token sai", async () => {
    expect((await callTool("get_shared_game", { token: "sai" })).isError).toBe(true);
  });


  it("khong doc duoc cuoc chia cua nguoi khac", async () => {
    const context = makeContext({ userId: "user-khac" });
    const games = parsed<unknown[]>(await callTool("list_games", {}, { context }));

    expect(games).toEqual([]);
    expect((await callTool("get_game", { game: "DSKVUF" }, { context })).isError).toBe(true);
  });

  it("bao thieu tham so bat buoc", async () => {
    expect((await callTool("get_game", {})).isError).toBe(true);
    expect((await callTool("get_shared_game", {})).isError).toBe(true);
  });
});
