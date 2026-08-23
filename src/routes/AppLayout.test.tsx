import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { ThemeProvider } from "../components/theme";
import { createFakeGameApi, createTestQueryClient } from "../test/fake-game-api";
import { AppLayout } from "./AppLayout";

const navigate = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({}),
  Link: ({ children, to }: { children: ReactNode; to?: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <p>{`chuyển tới ${to}`}</p>,
  Outlet: () => <p>nội dung trang</p>,
}));

vi.mock("../adapters/browser/auth-client", () => ({ authClient: { signOut } }));

let api: ReturnType<typeof createFakeGameApi>;
let fetchMock: ReturnType<typeof vi.fn>;

function renderLayout() {
  // AppLayout co ThemeToggle va sidebar goi useConfirm nen can ca hai provider.
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <ConfirmProvider>
          <AppLayout />
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

function sessionResponse(user: unknown) {
  return new Response(JSON.stringify({ user }));
}

beforeEach(() => {
  navigate.mockClear();
  signOut.mockClear();
  api = createFakeGameApi();
  fetchMock = vi.fn(async () => sessionResponse({ id: "user_1", name: "Chủ", image: null }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppLayout", () => {
  it("dang hoi session thi hien trang thai dang tai", () => {
    renderLayout();

    expect(screen.getByText("Đang tải...")).toBeInTheDocument();
  });

  it("chua dang nhap thi day ve trang dang nhap", async () => {
    fetchMock.mockResolvedValue(sessionResponse(null));
    renderLayout();

    expect(await screen.findByText("chuyển tới /login")).toBeInTheDocument();
  });

  it("da dang nhap thi hien noi dung trang va ten nguoi dung", async () => {
    renderLayout();

    expect(await screen.findByText("nội dung trang")).toBeInTheDocument();
    expect(screen.getAllByText(/Chủ/).length).toBeGreaterThan(0);
  });

  it("hien danh sach cuoc chia o sidebar", async () => {
    renderLayout();

    await screen.findByText("nội dung trang");
    await waitFor(() => expect(api.games.list).toHaveBeenCalled());
    expect(screen.getAllByText("Cầu lông").length).toBeGreaterThan(0);
  });

  it("dang xuat: het session thi ve trang dang nhap", async () => {
    const user = renderLayout();
    await screen.findByText("nội dung trang");

    fetchMock.mockResolvedValue(sessionResponse(null));
    await user.click(screen.getByRole("button", { name: "Thoát" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/login" }));
  });

  it("dang xuat: con session (vao bang SSO) thi qua trang logout cua SSO", async () => {
    const user = renderLayout();
    await screen.findByText("nội dung trang");

    const location = { origin: "https://chiakeo.huyab.click", href: "" } as Location;
    vi.spyOn(window, "location", "get").mockReturnValue(location);
    // /api/session van tra ve user => nguoi nay vao bang cookie SSO.

    await user.click(screen.getByRole("button", { name: "Thoát" }));

    // Cookie SSO nam o domain cha, chi trang logout cua SSO xoa duoc.
    await waitFor(() => expect(location.href).toContain("/logout"));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("mo duoc ngan cuoc chia tren mobile", async () => {
    const user = renderLayout();
    await screen.findByText("nội dung trang");

    await user.click(screen.getByRole("button", { name: /Danh sách cuộc chơi|Menu/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
