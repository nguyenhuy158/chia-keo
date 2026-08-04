import { describe, expect, it } from "vitest";
import { MAX_MCP_TOKENS_PER_USER } from "../../../../shared/schemas";
import { fakeRepo } from "../../mcp/fixtures";
import type { GameRepository, McpTokenRow } from "../ports/game-repository";
import { BadRequestError, NotFoundError } from "./errors";
import {
  authenticateMcpToken,
  createMcpToken,
  hashMcpToken,
  listMcpTokens,
  revokeMcpToken,
} from "./mcp-tokens";

const OWNER = "user-1";
const OTHER = "user-2";

function repoWithTokens(tokens: McpTokenRow[] = []): GameRepository {
  return fakeRepo({ tokens });
}

async function makeToken(
  repo: GameRepository,
  userId = OWNER,
  overrides: { name?: string; scopes?: ("games:read" | "summary:read" | "share:read")[] } = {},
) {
  return createMcpToken(repo, userId, {
    name: overrides.name || "Claude Code",
    scopes: overrides.scopes || ["games:read"],
  });
}

describe("createMcpToken", () => {
  it("tra ban goc dung mot lan va chi luu hash", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);

    expect(created.secret).toMatch(/^ck_[0-9a-f]{64}$/);

    const stored = await repo.mcpTokens.findByHash(await hashMcpToken(created.secret));
    expect(stored).toBeTruthy();
    // Ban goc khong duoc nam o bat cu dau trong dong da luu.
    expect(JSON.stringify(stored)).not.toContain(created.secret);
  });

  it("khong tra hash ra ngoai, chi tra tien to de doi chieu", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);

    expect(created.token).not.toHaveProperty("tokenHash");
    expect(created.secret.startsWith(created.token.tokenPrefix)).toBe(true);
    // Tien to phai ngan hon han ban goc, khong thi coi nhu lam lo token.
    expect(created.token.tokenPrefix.length).toBeLessThan(created.secret.length);
  });

  it("moi lan tao ra mot token khac nhau", async () => {
    const repo = repoWithTokens();
    const first = await makeToken(repo);
    const second = await makeToken(repo);

    expect(first.secret).not.toBe(second.secret);
  });

  it("giu dung bo scope da chon va bo trung lap", async () => {
    const repo = repoWithTokens();
    const created = await createMcpToken(repo, OWNER, {
      name: "Đọc tất cả",
      scopes: ["games:read", "summary:read", "games:read"],
    });

    expect(created.token.scopes).toEqual(["games:read", "summary:read"]);
  });

  it("tinh expiresAt tu so ngay, va de trong khi khong gioi han", async () => {
    const repo = repoWithTokens();
    const withExpiry = await createMcpToken(repo, OWNER, {
      name: "Tạm thời",
      scopes: ["games:read"],
      expiresInDays: 7,
    });
    const forever = await makeToken(repo);

    const created = Date.parse(withExpiry.token.createdAt);
    const expires = Date.parse(withExpiry.token.expiresAt || "");
    expect(Math.round((expires - created) / 86_400_000)).toBe(7);
    expect(forever.token.expiresAt).toBeNull();
  });

  it("chan khi vuot tran so token con hieu luc", async () => {
    const repo = repoWithTokens();
    for (let index = 0; index < MAX_MCP_TOKENS_PER_USER; index += 1) {
      await makeToken(repo, OWNER, { name: `Token ${index}` });
    }

    await expect(makeToken(repo)).rejects.toThrow(BadRequestError);
  });

  it("token da thu hoi khong con chiem cho trong tran", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);
    for (let index = 1; index < MAX_MCP_TOKENS_PER_USER; index += 1) {
      await makeToken(repo, OWNER, { name: `Token ${index}` });
    }

    await revokeMcpToken(repo, OWNER, created.token.id);
    await expect(makeToken(repo, OWNER, { name: "Sau khi thu hồi" })).resolves.toBeTruthy();
  });
});

describe("authenticateMcpToken", () => {
  it("doi ban goc thanh danh tinh kem scope", async () => {
    const repo = repoWithTokens();
    const created = await createMcpToken(repo, OWNER, {
      name: "Claude",
      scopes: ["games:read", "share:read"],
    });

    const identity = await authenticateMcpToken(repo, created.secret);
    expect(identity).toEqual({
      tokenId: created.token.id,
      userId: OWNER,
      scopes: ["games:read", "share:read"],
    });
  });

  it("tu choi token sai, sai tien to, va chuoi rong", async () => {
    const repo = repoWithTokens();
    await makeToken(repo);

    expect(await authenticateMcpToken(repo, "ck_khongtontai")).toBeNull();
    expect(await authenticateMcpToken(repo, "khong-co-tien-to")).toBeNull();
    expect(await authenticateMcpToken(repo, "")).toBeNull();
  });

  it("tu choi token da thu hoi", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);

    await revokeMcpToken(repo, OWNER, created.token.id);
    expect(await authenticateMcpToken(repo, created.secret)).toBeNull();
  });

  it("tu choi token da het han", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);
    const row = await repo.mcpTokens.findByHash(await hashMcpToken(created.secret));
    row!.expiresAt = "2020-01-01T00:00:00.000Z";

    expect(await authenticateMcpToken(repo, created.secret)).toBeNull();
  });

  it("tu choi token co scope la, khong con quyen nao dung", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);
    const row = await repo.mcpTokens.findByHash(await hashMcpToken(created.secret));
    // Gia lap scope cu/khong hop le con sot trong DB.
    row!.scopes = "games:delete-everything";

    expect(await authenticateMcpToken(repo, created.secret)).toBeNull();
  });

  it("loc scope la nhung giu scope hop le trong cung mot token", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);
    const row = await repo.mcpTokens.findByHash(await hashMcpToken(created.secret));
    row!.scopes = "games:read scope-bien-mat";

    const identity = await authenticateMcpToken(repo, created.secret);
    expect(identity?.scopes).toEqual(["games:read"]);
  });
});

describe("listMcpTokens / revokeMcpToken", () => {
  it("chi thay token cua chinh minh", async () => {
    const repo = repoWithTokens();
    await makeToken(repo, OWNER, { name: "Của tôi" });
    await makeToken(repo, OTHER, { name: "Của người khác" });

    const mine = await listMcpTokens(repo, OWNER);
    expect(mine.map((token) => token.name)).toEqual(["Của tôi"]);
  });

  it("danh sach khong bao gio kem hash", async () => {
    const repo = repoWithTokens();
    await makeToken(repo);

    const tokens = await listMcpTokens(repo, OWNER);
    expect(tokens[0]).not.toHaveProperty("tokenHash");
  });

  it("co co active de FE khong phai tu so moc thoi gian", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);
    expect((await listMcpTokens(repo, OWNER))[0].active).toBe(true);

    await revokeMcpToken(repo, OWNER, created.token.id);
    expect((await listMcpTokens(repo, OWNER))[0].active).toBe(false);
  });

  it("khong thu hoi duoc token cua nguoi khac du biet id", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo, OTHER);

    await expect(revokeMcpToken(repo, OWNER, created.token.id)).rejects.toThrow(NotFoundError);
    // Token cua nguoi kia van dung duoc.
    expect(await authenticateMcpToken(repo, created.secret)).toBeTruthy();
  });

  it("thu hoi lan hai bao khong tim thay", async () => {
    const repo = repoWithTokens();
    const created = await makeToken(repo);

    await revokeMcpToken(repo, OWNER, created.token.id);
    await expect(revokeMcpToken(repo, OWNER, created.token.id)).rejects.toThrow(NotFoundError);
  });
});
