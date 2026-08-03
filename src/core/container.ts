// Container DI toi gian: composition root (main.tsx) dang ky adapter cho tung
// port; UI va tang application chi lay port tu day, khong import adapter
// truc tiep.

import type { GameApiPort } from "./ports/game-api";
import type { QrProviderPort } from "./ports/qr-provider";

let gameApi: GameApiPort | null = null;
let qrProvider: QrProviderPort | null = null;

export function provideGameApi(port: GameApiPort) {
  gameApi = port;
}

export function getGameApi(): GameApiPort {
  if (!gameApi) throw new Error("GameApiPort chưa được đăng ký ở composition root (main.tsx)");
  return gameApi;
}

export function provideQrProvider(port: QrProviderPort) {
  qrProvider = port;
}

export function getQrProvider(): QrProviderPort {
  if (!qrProvider) {
    throw new Error("QrProviderPort chưa được đăng ký ở composition root (main.tsx)");
  }
  return qrProvider;
}
