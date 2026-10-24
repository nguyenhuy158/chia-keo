import { describe, expect, it, vi } from "vitest";
import type { GameApiPort } from "./ports/game-api";
import type { QrProviderPort } from "./ports/qr-provider";

describe("application ports", () => {
  it("requires registration and returns the registered adapters", async () => {
    vi.resetModules();
    const { getGameApi, getQrProvider, provideGameApi, provideQrProvider } =
      await import("./container");
    expect(() => getGameApi()).toThrow("GameApiPort chưa được đăng ký");
    expect(() => getQrProvider()).toThrow("QrProviderPort chưa được đăng ký");
    const gameApi = {} as GameApiPort;
    const qrProvider = {} as QrProviderPort;
    provideGameApi(gameApi);
    provideQrProvider(qrProvider);
    expect(getGameApi()).toBe(gameApi);
    expect(getQrProvider()).toBe(qrProvider);
  });
});
