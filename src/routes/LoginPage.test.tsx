import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../components/theme";
import { createTestQueryClient } from "../test/fake-game-api";
import { LoginPage } from "./LoginPage";

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <p>{`chuyển tới ${to}`}</p>,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

let fetchMock: ReturnType<typeof vi.fn>;

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ user: null })));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("dang hoi session thi hien trang thai cho", () => {
    renderPage();

    expect(screen.getByText("Đang tải...")).toBeInTheDocument();
  });

  it("chua dang nhap thi hien nut dang nhap Google", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: /Google/ })).toBeInTheDocument();
  });

  it("da dang nhap roi thi day thang ve trang chinh", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "user_1", name: "Chủ", image: null } })),
    );
    renderPage();

    expect(await screen.findByText("chuyển tới /")).toBeInTheDocument();
  });

  it("bam dang nhap thi chuyen sang trang SSO", async () => {
    const user = renderPage();
    const location = { origin: "https://chiakeo.huyab.click", href: "" } as Location;
    vi.spyOn(window, "location", "get").mockReturnValue(location);

    await user.click(await screen.findByRole("button", { name: /Google/ }));

    expect(location.href).toContain("auth.huyab.click/login");
  });
});
