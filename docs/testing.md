# Testing & coverage

## Chay

```bash
pnpm test        # vitest mot lan
pnpm test:watch  # vitest che do watch
pnpm test:cov    # vitest + bao cao coverage (coverage/index.html)
```

CI chay `pnpm check` -> `pnpm test:cov` -> `pnpm build` tren moi PR va moi
push vao `main`.

## Pham vi do coverage

Chi do phan **logic thuan**, khai bao trong `vite.config.ts`:

- `shared/**` — domain kernel dung chung FE + worker
- `src/core/**` — FE domain rules
- `worker/src/core/**` — use case + policy cua backend

Khong do: component/route React, adapter IO (`src/adapters/*`,
`worker/src/adapters/*`), `ports/**` (chi co type), file sinh luc build, va
composition root. Nhung phan do can e2e (`pnpm e2e`) chu khong phai unit test;
do vao chi lam con so loang.

## Nguong hien tai

`vite.config.ts` dat nguong bang **muc dang dat**, lam chot chong tut lui —
them code khong kem test se lam CI do:

| Chi so | Nguong | Dang dat |
| --- | --- | --- |
| Statements | 81 | 81.33% |
| Branches | 72 | 72.64% |
| Functions | 78 | 78.74% |
| Lines | 83 | 83.53% |

## Duong den 90%

`shared/**` da o 97% statements. Khoang cach nam gan het o
`worker/src/core/application/`, cac file chua co test nao:

| File | Stmts | Ghi chu |
| --- | --- | --- |
| `photos.ts` | 2% | upload/xoa/gan anh vao khoan chi |
| `ai-suggestions.ts` | 0% | goi AiProvider + chuan hoa ket qua |
| `contacts.ts` | 0% | danh ba nguoi quen |
| `fun-stats.ts` | 0% | thong ke vui |
| `games.ts` | 45% | tao/sua/doi che do chia |
| `game-events.ts` | 76% | phan undo cua lich su |
| `profile.ts` | 0% | doi ten hien thi |

`fake-game-repository.ts` trong cung thu muc da co san repo gia trong bo nho —
viet them test cho cac file tren dung lai duoc, khong can dung ha tang moi.
Moi lan phu them, nho **nang nguong trong `vite.config.ts`** len muc moi.
