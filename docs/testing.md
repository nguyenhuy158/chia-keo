# Testing & coverage

## Chay

```bash
pnpm test        # vitest mot lan
pnpm test:watch  # vitest che do watch
pnpm test:cov    # vitest + bao cao coverage (mo coverage/index.html)
```

CI chay `pnpm check` -> `pnpm test:cov` -> `pnpm build` tren moi PR va moi
push vao `main`.

## Hai moi truong test

`vite.config.ts` khai bao hai project:

| Project | File | Moi truong | Dung cho |
| --- | --- | --- | --- |
| `node` | `**/*.test.ts` | node | domain kernel, use case worker, adapter thuan |
| `dom` | `src/**/*.test.tsx` | jsdom | component va hook React |

Tach bang duoi file nen khong file nao phai gan docblock
`@vitest-environment`.

## Ha tang test dung chung

| File | Dung de |
| --- | --- |
| `worker/src/core/application/fake-game-repository.ts` | `GameRepository` trong bo nho, giu dung ngu nghia D1 (sequence, cascade, split cua nguoi con song) |
| `worker/src/test-support/sqlite-d1.ts` | `D1Database` chay tren `node:sqlite` da ap het migration — de test adapter D1 tren SQL that, ke ca rang buoc khoa ngoai |
| `worker/src/test-support/fake-d1.ts` | D1 toi thieu cho cac cho cham thang vao DB (health check, drizzle o route session) |
| `worker/src/test-support/route-harness.ts` | env gia + `callApi` de goi thang app Hono that |
| `src/test/fake-game-api.tsx` | `GameApiPort` gia + wrapper React Query |
| `src/test/fake-canvas.ts` | canvas 2d gia cho jsdom (ve anh tong ket, nen anh) |

Cac file nay khong tinh vao coverage.

## Nguong hien tai

Nguong dat bang **muc dang dat**, lam chot chong tut lui — them code khong kem
test se lam CI do:

| Chi so | Nguong | Dang dat |
| --- | --- | --- |
| Statements | 90 | 90.09% |
| Branches | 81 | 81.74% |
| Functions | 87 | 87.85% |
| Lines | 92 | 92.10% |

Pham vi do la toan bo code viet tay (`shared/`, `src/`, `worker/`), tru file
test, ha tang test, `**/ports/**` (chi co type) va file sinh luc build.

## Vai luu y khi viet test moi

- **Provider**: component co `ThemeToggle` phai boc `ThemeProvider`; component
  goi `useConfirm` phai boc `ConfirmProvider`; component ve QR can
  `createFakeGameApi()` (no dang ky luon `QrProviderPort`).
- **Portal**: menu/overlay ve bang `createPortal(document.body)`. Neu su kien
  khong toi duoc React, render voi `{ container: document.body }`.
- **QueryClient trong test**: dung `createTestQueryClient()`, dung dat
  `gcTime: 0` — cache khong co observer se bi don ngay va `getQueryData` doc ra
  `undefined`.
- **Nang nguong**: moi lan phu them dang ke, nang so trong `vite.config.ts` len
  muc moi va cap nhat bang tren.
