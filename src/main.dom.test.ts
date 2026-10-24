import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  createRoot: vi.fn(),
  provideGameApi: vi.fn(),
  provideQrProvider: vi.fn(),
  createHttpGameApi: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
  createRoot: mocks.createRoot,
}));
vi.mock("./core/container", () => ({
  provideGameApi: mocks.provideGameApi,
  provideQrProvider: mocks.provideQrProvider,
}));
vi.mock("./adapters/browser/http-game-api", () => ({
  createHttpGameApi: mocks.createHttpGameApi,
}));
vi.mock("./adapters/browser/vietqr", () => ({
  vietQrProvider: { name: "vietqr" },
}));
vi.mock("./router", () => ({ router: { name: "router" } }));
vi.mock("./components/ConfirmDialog", () => ({ ConfirmProvider: () => null }));
vi.mock("./components/theme", () => ({ ThemeProvider: () => null }));

beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.createRoot.mockReturnValue({ render: mocks.render });
  mocks.createHttpGameApi.mockReturnValue({ name: "api" });
  document.body.innerHTML = '<div id="root"></div>';
});

describe("main", () => {
  it("connects adapters and renders the application", async () => {
    await import("./main");
    expect(mocks.provideGameApi).toHaveBeenCalledWith({ name: "api" });
    expect(mocks.provideQrProvider).toHaveBeenCalledWith({ name: "vietqr" });
    expect(mocks.createRoot).toHaveBeenCalledWith(
      document.getElementById("root"),
    );
    expect(mocks.render).toHaveBeenCalledOnce();
  });
});
