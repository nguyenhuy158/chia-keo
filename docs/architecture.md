# Kiến trúc

Project dùng hexagonal architecture (ports & adapters) cho cả frontend và
worker, với một domain kernel dùng chung ở `shared/`. Mục tiêu: thay được từng
mảnh (DB, AI provider, QR provider, HTTP client) bằng cách viết một adapter
mới, không đụng vào business logic.

```text
shared/                      # Domain kernel dùng chung FE + worker (thuần, không IO)
  split.ts                   #   Rule chia tiền, balance, settlement, computeSplitRows
  schemas.ts                 #   Zod schema input + hằng số domain
  ai.ts                      #   Chuẩn hóa/resolve gợi ý AI (thuần)
  api-types.ts               #   DTO trao đổi giữa FE và worker
  rate-limit.ts              #   Logic rate limit thuần

src/                         # Hexagon frontend
  core/
    domain/money.ts          #   Format/parse VND
    ports/game-api.ts        #   Port gọi backend
    ports/qr-provider.ts     #   Port sinh QR chuyển khoản
    container.ts             #   DI tối giản: provide*/get* cho từng port
  adapters/
    browser/http-game-api.ts #   Adapter fetch cho GameApiPort
    browser/vietqr.ts        #   Adapter VietQR cho QrProviderPort
    browser/auth-client.ts   #   Better Auth client (dùng trực tiếp ở UI)
    browser/theme.ts         #   localStorage + matchMedia cho theme
    react-query/queries.ts   #   Hook React Query bọc GameApiPort (driving adapter)
  components/, routes/       #   Presentation
  main.tsx                   #   Composition root: cắm adapter vào port

worker/src/                  # Hexagon backend
  core/
    ports/game-repository.ts #   Port lưu trữ (row types + interface)
    ports/ai-provider.ts     #   Port model AI sinh JSON
    application/             #   Use case + policy (ownership, realloc, transfer...)
      errors.ts              #     NotFound/InvalidInput/AiProvider error
      game-detail.ts         #     Assembly ApiGameDetail + summary
      games.ts, participants.ts, expenses.ts, share-links.ts, ai-suggestions.ts
  adapters/
    d1/schema.ts             #   Drizzle schema (nguồn cho drizzle-kit)
    d1/game-repository.ts    #   Adapter D1/drizzle cho GameRepository
    gemini/gemini.ts         #   Adapter Gemini cho AiProvider
  routes/                    #   Driving adapter HTTP (Hono): parse -> use case -> JSON
  lib/                       #   Hạ tầng nhỏ: http helper, ids, require-user, rate limit
  auth.ts, env.ts, index.ts  #   Better Auth, kiểu Env, app + middleware
```

## Chiều phụ thuộc hợp lệ

```text
UI/routes -> adapters -> core -> shared
UI/routes -> core (ports, container, domain)
worker routes -> application -> ports <- adapters (d1, gemini)
```

Không làm:

- `core` (FE lẫn worker) import từ `adapters`.
- `core` gọi `fetch`, `window`, `document`, driver DB hay SDK service ngoài.
- Business rule mới đặt trong component React hoặc route Hono.
- `shared/` import bất cứ thứ gì ngoài zod (không React, không drizzle).

## Composition root — nơi cắm adapter

- Frontend: `src/main.tsx` gọi `provideGameApi(createHttpGameApi())` và
  `provideQrProvider(vietQrProvider)`. Test/offline chỉ cần provide adapter khác.
- Worker: middleware `requireUser` (worker/src/lib/require-user.ts) tạo
  `createD1GameRepository(c.env.DB)` gắn vào context; route AI tạo
  `createGeminiAiProvider(c.env)`.

## Muốn thay một mảnh thì làm gì

| Muốn thay | Viết adapter mới implement | Cắm ở |
| --- | --- | --- |
| D1 -> DB khác | `GameRepository` (worker/src/core/ports/game-repository.ts) | `require-user.ts` + `routes/share.ts` |
| Gemini -> AI khác | `AiProvider` (worker/src/core/ports/ai-provider.ts) | `routes/ai.ts` |
| VietQR -> QR khác | `QrProviderPort` (src/core/ports/qr-provider.ts) | `src/main.tsx` |
| fetch -> mock/offline | `GameApiPort` (src/core/ports/game-api.ts) | `src/main.tsx` |

## Checklist thêm tính năng

1. Rule tính toán/validate thuần: thêm vào `shared/` (dùng chung) hoặc
   `src/core/domain` (chỉ FE) và viết test thuần.
2. Nghiệp vụ phía backend: thêm use case trong `worker/src/core/application`,
   khai báo thao tác dữ liệu cần thiết vào port `GameRepository`, implement
   trong `adapters/d1`.
3. Route Hono chỉ parse input (zod qua `readJson`), gọi use case qua
   `respond()` để map lỗi nghiệp vụ sang HTTP status.
4. Phía FE: gọi API qua hook trong `src/adapters/react-query/queries.ts`
   (hook lấy `GameApiPort` từ container).
5. Chạy `pnpm check`, `pnpm test`, `pnpm build`; flow chính chạy `pnpm e2e`.
