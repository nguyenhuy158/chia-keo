import { beforeEach, describe, expect, it, vi } from "vitest";

const { state, createAuthClient, usernameClient } = vi.hoisted(() => ({
  state: { base: "" },
  createAuthClient: vi.fn(),
  usernameClient: vi.fn(() => "username-plugin"),
}));

vi.mock("./http-game-api", () => ({
  get API_BASE() {
    return state.base;
  },
}));
vi.mock("better-auth/client/plugins", () => ({ usernameClient }));
vi.mock("better-auth/react", () => ({ createAuthClient }));

beforeEach(() => {
  vi.resetModules();
  createAuthClient.mockReset().mockReturnValue({ signIn: vi.fn() });
  usernameClient.mockClear();
});

describe("browser auth client", () => {
  it("uses the current origin when the API base is empty", async () => {
    state.base = "";
    const { authClient, usernameToEmail } = await import("./auth-client");
    expect(createAuthClient).toHaveBeenCalledWith({
      baseURL: `${window.location.origin}/api/auth`,
      plugins: ["username-plugin"],
      fetchOptions: { credentials: "include" },
    });
    expect(authClient).toHaveProperty("signIn");
    expect(usernameClient).toHaveBeenCalledOnce();
    expect(usernameToEmail("Huy.Nguyen")).toBe("huy.nguyen@chia-keo.local");
  });

  it("uses a configured API base for authentication", async () => {
    state.base = "https://api.example.test";
    await import("./auth-client");
    expect(createAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://api.example.test/api/auth" }),
    );
  });
});
