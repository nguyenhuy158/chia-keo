import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiMcpToken } from "../../shared/api-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeGameApi, createTestQueryClient } from "../test/fake-game-api";
import { ConfirmProvider } from "./ConfirmDialog";
import { McpTokenPanel } from "./McpTokenPanel";

let api: ReturnType<typeof createFakeGameApi>;

function tokenRow(overrides: Partial<ApiMcpToken> = {}): ApiMcpToken {
  return {
    id: "token_1",
    name: "Claude Code",
    tokenPrefix: "mcp_ab",
    scopes: ["games:read"],
    createdAt: "2026-08-01T00:00:00.000Z",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    active: true,
    ...overrides,
  };
}

function renderPanel() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>
        <McpTokenPanel />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  api = createFakeGameApi();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

describe("McpTokenPanel", () => {
  it("chua co token nao thi khong hien dong nao", async () => {
    renderPanel();

    await waitFor(() => expect(api.mcpTokens.list).toHaveBeenCalled());
    expect(screen.queryByText("Claude Code")).toBeNull();
  });

  it("hien token da tao kem tien to de doi chieu", async () => {
    api.mcpTokens.list.mockResolvedValue([tokenRow()] as never);
    renderPanel();

    expect(await screen.findByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText(/mcp_ab/)).toBeInTheDocument();
  });

  it("token da thu hoi duoc danh dau", async () => {
    api.mcpTokens.list.mockResolvedValue([
      tokenRow({ active: false, revokedAt: "2026-08-02T00:00:00.000Z" }),
    ] as never);
    renderPanel();

    expect(await screen.findByText(/thu hồi/i)).toBeInTheDocument();
  });

  it("tao token moi va hien ban goc dung mot lan", async () => {
    const user = renderPanel();
    await waitFor(() => expect(api.mcpTokens.list).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Tạo token mới/ }));
    await user.type(screen.getByPlaceholderText("Claude Code ở máy bàn"), "Máy bàn");
    await user.click(screen.getByRole("button", { name: /^Tạo token$/ }));

    await waitFor(() => expect(api.mcpTokens.create).toHaveBeenCalled());
    expect((await screen.findAllByText(/mcp_abc123/)).length).toBeGreaterThan(0);
  });

  it("thu hoi mot token", async () => {
    api.mcpTokens.list.mockResolvedValue([tokenRow()] as never);
    const user = renderPanel();

    await user.click(await screen.findByRole("button", { name: "Thu hồi token" }));

    const dialog = await screen.findByRole("alertdialog").catch(() => null);
    if (dialog) {
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[buttons.length - 1]);
    }

    await waitFor(() => expect(api.mcpTokens.revoke).toHaveBeenCalledWith("token_1"));
  });

  it("tai danh sach loi thi bao ro", async () => {
    api.mcpTokens.list.mockRejectedValue(new Error("mat mang"));
    renderPanel();

    await waitFor(() => expect(api.mcpTokens.list).toHaveBeenCalled());
    expect(await screen.findByText(/không tải được|thất bại|lỗi/i)).toBeInTheDocument();
  });
});
