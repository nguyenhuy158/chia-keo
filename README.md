# Chia Keo

Ung dung chia tien nhom cho cac buoi an, di choi, du lich hoac nhom chi tieu nho.

## Hien trang

Full-stack, du lieu luu tren Cloudflare D1:

- Frontend: React + Vite + TypeScript + Tailwind CSS, routing bang TanStack Router,
  API state bang TanStack Query, form validation bang react-hook-form + Zod.
- Backend: Hono chay tren Cloudflare Worker, validate input bang Zod.
- DB: Cloudflare D1, schema va migration bang Drizzle ORM + drizzle-kit.
- Auth: Better Auth (email/password + username plugin), dang nhap bang username/mat khau.
- Deploy: mot Worker duy nhat serve ca API (`/api/*`) va static FE (Workers Static Assets,
  SPA fallback). Khong can CORS/cookie cross-site vi FE va API cung origin.

Tinh nang:

- Dang ky / dang nhap bang username + mat khau (Better Auth, cookie session).
- Tao nhieu cuoc choi; du lieu tach biet theo tai khoan.
- Them nguoi tham gia va thong tin ngan hang (payment profile).
- Ghi khoan chi, nguoi tra tien, danh sach nguoi cung chia.
- Backend tu tinh `da tra`, `phan chiu`, `con lai` va danh sach chuyen khoan toi uu
  (khong tin client-side amount/split; summary tinh lai tu DB).
- Link share read-only `/share/:token` luu trong DB: tao / tat-bat / doi token.
- Tao VietQR bang `img.vietqr.io` neu nguoi nhan co du thong tin ngan hang.

## Cau truc thu muc

- `src/` — frontend React (routes, components, lib).
- `shared/` — logic thuan dung chung FE + Worker: `split.ts` (chia tien, settlement),
  `schemas.ts` (Zod input), `api-types.ts` (kieu API response).
- `worker/src/` — Hono API: `db/schema.ts` (Drizzle), `auth.ts` (Better Auth),
  `routes/games.ts`, `routes/share.ts`.
- `drizzle/` — SQL migrations sinh boi drizzle-kit (apply bang wrangler d1 migrations).
- `wrangler.jsonc` — config Worker + D1 binding + static assets.

## Lenh local

```bash
pnpm install

# 1. Tao secret cho Better Auth
cp .dev.vars.example .dev.vars   # sua BETTER_AUTH_SECRET

# 2. Tao DB local va build FE lan dau (wrangler dev can thu muc dist/)
pnpm db:migrate:local
pnpm build

# 3. Chay API (terminal 1) va FE dev server (terminal 2)
pnpm dev:api                     # wrangler dev, port 8787
pnpm dev                         # vite, port 5173, proxy /api -> 8787

# Test + typecheck
pnpm test
pnpm check
```

Co the chi chay `pnpm dev:api` va mo `http://127.0.0.1:8787` de dung ban build production.

## Luong tinh tien

Voi moi khoan chi:

1. Lay `amount`.
2. Lay danh sach nguoi duoc tick trong `expense_splits`.
3. Chia `amount / so nguoi duoc tick`.
4. Neu so tien le, phan du duoc cong lan luot cho cac nguoi dau danh sach de tong split
   luon bang tong tien goc.

Voi moi nguoi:

- `paid_total`: tong tien nguoi do da tra.
- `owed_total`: tong phan nguoi do phai chiu.
- `balance = paid_total - owed_total`.

Y nghia balance:

- `balance > 0`: duoc nhan lai.
- `balance < 0`: phai chuyen them.
- `balance = 0`: da can bang.

Sau khi co balance:

1. Tao danh sach nguoi no tu balance am.
2. Tao danh sach nguoi nhan tu balance duong.
3. Sap xep theo so tien giam dan.
4. Ghep nguoi no voi nguoi nhan, moi lan lay so tien nho hon giua hai ben.
5. Lap den khi het no hoac het nguoi nhan.

Logic nay nam trong `shared/split.ts`, co test tai `shared/split.test.ts`, va chi chay
tren Worker (client chi hien thi ket qua tu API).

## Data model

Schema Drizzle tai `worker/src/db/schema.ts`:

- Better Auth: `user` (kem `username`), `session`, `account`, `verification`.
- App: `games` (owner_user_id, code, name), `participants`, `expenses`
  (payer_participant_id, amount, note), `expense_splits` (amount tung nguoi),
  `share_links` (token, enabled, expires_at), `payment_profiles`
  (bank_id, account_no, account_name, qr_type).

## API

Base path `/api`. Cac route can dang nhap (cookie session), tru share.

- `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/username`,
  `POST /api/auth/sign-out`, ... (Better Auth, username plugin; email sinh noi bo
  tu username dang `<username>@chia-keo.local`).
- `GET /api/games` — danh sach game cua user kem so nguoi / so khoan.
- `POST /api/games`, `GET|PATCH|DELETE /api/games/:gameId`.
- `GET /api/games/:gameId/summary`.
- `POST /api/games/:gameId/participants`, `PATCH|DELETE /api/participants/:participantId`
  (xoa nguoi se chia lai cac khoan chi lien quan; khoan chi khong con ai chiu bi xoa).
- `POST /api/games/:gameId/expenses`, `PATCH|DELETE /api/expenses/:expenseId`
  (server tu chia `expense_splits` tu `splitParticipantIds`).
- `POST /api/games/:gameId/share-links` — tao/doi token (token cu het hieu luc).
- `PATCH /api/games/:gameId/share-link` — bat/tat link.
- `GET /api/share/:token` — public, read-only.

Cac route game/participant/expense tra ve nguyen `GameDetail` (participants + expenses +
summary + shareLink) de FE cap nhat cache mot lan.

## Deploy (Cloudflare)

Mot Worker duy nhat serve ca FE va API:

```bash
# Lan dau:
wrangler d1 create chia-keo          # lay database_id, dien vao wrangler.jsonc
wrangler secret put BETTER_AUTH_SECRET
pnpm db:migrate:remote

# Moi lan deploy:
pnpm deploy                          # = pnpm build && wrangler deploy
```

CI/CD: `.github/workflows/ci.yml` chay test + build cho moi PR, va tu dong apply
migration + deploy khi push `main` (can secrets `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID` trong GitHub repo).

Neu muon host FE rieng (vi du Cloudflare Pages), set `ALLOWED_ORIGINS` trong
`wrangler.jsonc` thanh origin cua FE va set `VITE_API_URL` khi build FE. Mac dinh
khong can vi FE va API cung origin.

## Bien moi truong

Frontend (build-time):

- `VITE_API_URL` — chi can khi FE va API khac origin; de trong khi dung chung Worker.

Worker:

- `BETTER_AUTH_SECRET` — secret (wrangler secret / `.dev.vars`).
- `BETTER_AUTH_URL` — optional; mac dinh suy ra tu request.
- `ALLOWED_ORIGINS` — danh sach origin FE cach nhau dau phay (chi can khi khac origin).
- D1 binding: `DB`.

## Bao mat

- Password hash boi Better Auth; khong luu plain password.
- Public share chi read-only; token 48 hex ky tu ngau nhien, co the tat hoac doi,
  co cot `expires_at` san cho han su dung.
- Moi truy van game/participant/expense deu kiem tra owner; user khac nhan 404.
- Validate input bang Zod o ca FE (react-hook-form) va Worker.
- Backend khong tin client-side amount/split; splits va summary tinh lai tu DB.
- Con thieu (viec sau): rate limit endpoint login/tao link (Cloudflare rate limiting
  binding), Cloudflare Turnstile cho form login/public link.

## Roadmap

1. ~~Tach routing FE sang TanStack Router.~~ Xong.
2. ~~Them form validation bang react-hook-form + zod.~~ Xong.
3. ~~Them Hono Worker API.~~ Xong.
4. ~~Them Drizzle schema va D1 migrations.~~ Xong.
5. ~~Thay `localStorage` bang API + React Query.~~ Xong.
6. ~~Them Better Auth username/password.~~ Xong.
7. ~~Them public share backed by DB.~~ Xong.
8. ~~Chot QR.~~ Dung VietQR (`img.vietqr.io`) cho ngan hang Viet Nam.
9. ~~Them test cho logic split va settlement.~~ Xong (`pnpm test`).
10. ~~Cau hinh deploy.~~ Xong: mot Worker serve FE + API, GitHub Actions deploy.

Viec tiep theo (ngoai roadmap cu): rate limit + Turnstile, sua/xoa ten cuoc choi tren UI,
edit khoan chi tren UI (API da co `PATCH /api/expenses/:id`), E2E test bang Playwright.
