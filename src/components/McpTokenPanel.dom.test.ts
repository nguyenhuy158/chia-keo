import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiMcpToken } from "../../shared/api-types";

const { state, create, revoke, confirm, copy, success, error } = vi.hoisted(
  () => ({
    state: {
      tokens: undefined as ApiMcpToken[] | undefined,
      loading: false,
      queryError: false,
      creating: false,
      createError: null as Error | null,
      revoking: false,
      desktop: false,
    },
    create: vi.fn(),
    revoke: vi.fn(),
    confirm: vi.fn(),
    copy: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
);

vi.mock("../adapters/react-query/queries", () => ({
  useMcpTokens: () => ({
    data: state.tokens,
    isPending: state.loading,
    isError: state.queryError,
  }),
  useCreateMcpToken: () => ({
    mutateAsync: create,
    isPending: state.creating,
    error: state.createError,
  }),
  useRevokeMcpToken: () => ({ mutateAsync: revoke, isPending: state.revoking }),
}));
vi.mock("../adapters/browser/clipboard", () => ({ copyText: copy }));
vi.mock("./ConfirmDialog", () => ({ useConfirm: () => confirm }));
vi.mock("sonner", () => ({ toast: { success, error } }));

import { McpTokenPanel } from "./McpTokenPanel";

let host: HTMLDivElement;
let root: Root;

function token(overrides: Partial<ApiMcpToken> = {}): ApiMcpToken {
  return {
    id: "token-1",
    name: "Máy bàn",
    tokenPrefix: "ck_123",
    scopes: ["games:read", "summary:read"],
    createdAt: "2026-01-01T00:00:00Z",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    active: true,
    ...overrides,
  };
}

function render() {
  act(() => root.render(createElement(McpTokenPanel)));
}

function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  ) as HTMLButtonElement | undefined;
}

function fillName(value: string) {
  act(() => {
    const input = host.querySelector("#mcp-token-name") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit() {
  await act(async () =>
    host
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.tokens = undefined;
  state.loading = false;
  state.queryError = false;
  state.creating = false;
  state.createError = null;
  state.revoking = false;
  state.desktop = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: state.desktop })),
  );
  create.mockReset().mockResolvedValue({ secret: "ck_secret" });
  revoke.mockReset().mockResolvedValue(undefined);
  confirm.mockReset().mockResolvedValue(true);
  copy.mockReset().mockResolvedValue(true);
  success.mockReset();
  error.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("McpTokenPanel", () => {
  it("shows loading, failure, and empty token states", () => {
    state.loading = true;
    render();
    expect(host.textContent).not.toContain("Chưa có token nào");
    state.loading = false;
    state.queryError = true;
    render();
    expect(host.textContent).toContain("Không tải được danh sách token");
    state.queryError = false;
    state.tokens = [];
    render();
    expect(host.textContent).toContain("Chưa có token nào");
    expect(host.textContent).toContain("0/20 chưa thu hồi");
  });

  it("shows active, expired, and revoked tokens with usage details", () => {
    state.tokens = [
      token(),
      token({
        id: "token-2",
        name: "Laptop",
        active: false,
        lastUsedAt: "2026-01-02T00:00:00Z",
        expiresAt: "2026-02-01T00:00:00Z",
      }),
      token({
        id: "token-3",
        name: "Cũ",
        active: false,
        revokedAt: "2026-01-03T00:00:00Z",
      }),
    ];
    render();
    expect(host.textContent).toContain("Đang dùng");
    expect(host.textContent).toContain("Hết hạn");
    expect(host.textContent).toContain("Đã thu hồi");
    expect(host.textContent).toContain("chưa dùng lần nào");
    expect(host.textContent).toContain("dùng lần cuối");
    expect(host.textContent).toContain("hết hạn");
    expect(host.textContent).toContain("2/20 chưa thu hồi");
    expect(
      host.querySelectorAll('button[aria-label="Thu hồi token"]'),
    ).toHaveLength(2);
  });

  it("validates, scopes, expiry, and creates a token", async () => {
    state.tokens = [];
    render();
    expect(button("Tạo token mới")?.getAttribute("aria-expanded")).toBe(
      "false",
    );
    act(() => button("Tạo token mới")?.click());
    await submit();
    expect(host.textContent).toContain("Nhập tên token");
    fillName("Claude Code");
    const checkboxes = [
      ...host.querySelectorAll('input[type="checkbox"]'),
    ] as HTMLInputElement[];
    act(() => checkboxes[2].click());
    act(() => button("30 ngày")?.click());
    await submit();
    expect(create).toHaveBeenCalledWith({
      name: "Claude Code",
      scopes: ["games:read", "summary:read", "share:read"],
      expiresInDays: 30,
    });
    expect(host.textContent).toContain("Token chỉ hiện lần này");
    expect(host.textContent).toContain("ck_secret");
    expect(button("Tạo token mới")?.getAttribute("aria-expanded")).toBe(
      "false",
    );
    act(() => button("Tôi đã lưu token")?.click());
    expect(host.textContent).not.toContain("Token chỉ hiện lần này");
  });

  it("can remove every scope and shows backend create errors", async () => {
    state.tokens = [];
    state.desktop = true;
    state.createError = new Error("too_many_mcp_tokens");
    render();
    expect(button("Tạo token mới")?.getAttribute("aria-expanded")).toBe("true");
    expect(host.textContent).toContain("Đã đủ");
    fillName("Máy bàn");
    const checkboxes = [
      ...host.querySelectorAll('input[type="checkbox"]'),
    ] as HTMLInputElement[];
    act(() => checkboxes[0].click());
    act(() => checkboxes[1].click());
    await submit();
    expect(host.textContent).toContain("Chọn ít nhất một quyền");
    state.createError = new Error("rate_limited");
    render();
    expect(host.textContent).toContain("Tạo quá nhanh");
    state.createError = new Error("offline");
    render();
    expect(host.textContent).toContain("Không tạo được token");
    state.creating = true;
    render();
    expect(button("Đang tạo...")?.disabled).toBe(true);
  });

  it("keeps the form open after creating a token on desktop", async () => {
    state.desktop = true;
    state.tokens = [];
    render();
    fillName("Máy bàn");
    await submit();
    expect(create).toHaveBeenCalledOnce();
    expect(button("Tạo token mới")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("confirms revocation and copies the one-time secret and command", async () => {
    state.tokens = [token()];
    render();
    confirm.mockResolvedValueOnce(false);
    await act(async () => button("Thu hồi token")?.click());
    expect(revoke).not.toHaveBeenCalled();
    await act(async () => button("Thu hồi token")?.click());
    expect(revoke).toHaveBeenCalledWith("token-1");
    expect(success).toHaveBeenCalledWith("Đã thu hồi token");
    act(() => button("Tạo token mới")?.click());
    fillName("Máy bàn");
    await submit();
    const copyButtons = [
      ...host.querySelectorAll('button[aria-label^="Copy "]'),
    ] as HTMLButtonElement[];
    await act(async () => copyButtons[0].click());
    expect(copy).toHaveBeenCalledWith("ck_secret");
    expect(success).toHaveBeenCalledWith("Đã copy token");
    await act(async () => copyButtons[1].click());
    expect(copy).toHaveBeenCalledWith(
      expect.stringContaining("claude mcp add"),
    );
    vi.useFakeTimers();
    await act(async () => copyButtons[0].click());
    act(() => vi.advanceTimersByTime(1600));
    vi.useRealTimers();
    copy.mockResolvedValueOnce(false);
    await act(async () => copyButtons[0].click());
    expect(error).toHaveBeenCalledWith("Không copy được, hãy chọn tay");
  });
});
