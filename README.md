# Chia Keo

Ung dung chia tien nhom cho cac buoi an, di choi, du lich hoac nhom chi tieu nho.

## Hien trang

- Frontend: React, Vite, TypeScript, Tailwind CSS.
- Luu tru: Cloudflare D1 cho users, session, game, share link, profile va mau chi tieu.
- Dang nhap: username/password qua Better Auth tren Worker, session luu bang HttpOnly cookie.
- Tinh nang dang co:
  - Tao nhieu cuoc choi.
  - Them nguoi tham gia va thong tin ngan hang.
  - Ghi khoan chi, nguoi tra tien, danh sach nguoi cung chia.
  - Dùng Gemini để gợi ý khoản chi từ câu nhập nhanh hoặc ảnh hóa đơn.
  - Lưu mẫu chi tiêu, xuất báo cáo text và xem thống kê nhanh.
- Tinh `da tra`, `phan chiu`, `con lai`.
- Sinh danh sach nguoi can chuyen tien ve chu cuoc choi.
  - Tạo link share dạng chỉ xem hoặc cho nhập thêm khoản chi qua `/share/:token`.
  - Tao VietQR bang `img.vietqr.io` neu nguoi nhan co du thong tin ngan hang.

## Kiến trúc hiện tại

Project đang áp dụng hexagonal architecture dạng nhẹ cho frontend.

```text
src/
  core/
    domain/          # Type, rule tính tiền, tiền tệ, phân loại, schema
    application/     # Use case điều phối domain
    ports/           # Interface để adapter implement khi cần
  adapters/
    browser/         # fetch API, DiceBear avatar, VietQR
  lib/               # Compatibility re-export cho import cũ
  App.tsx            # Presentation layer
```

Quy tắc chính:

- `src/core` không import `fetch`, DiceBear, VietQR, React UI hoặc browser API.
- Logic tính toán và validate nằm trong `src/core/domain`.
- Use case phối hợp nhiều rule nằm trong `src/core/application`.
- Code phụ thuộc browser/service ngoài nằm trong `src/adapters/browser`.
- UI chỉ gọi core/adapters qua entrypoint rõ ràng, không tự chứa business rule phức tạp.

Xem thêm: `docs/architecture.md`.

## Stack production de xuat

### Core

- FE: React + Vite + TypeScript + Tailwind + shadcn/ui.
- Backend: Hono chay tren Cloudflare Worker.
- DB: Cloudflare D1.
- ORM/migration: Drizzle ORM + drizzle-kit.
- Auth: Better Auth + username plugin + password.
- Deploy:
  - Frontend deploy Cloudflare Pages.
  - API Worker deploy bang Wrangler hoac GitHub Actions.

### Thu vien nen them

- Form: `react-hook-form` + `zod`.
- API state: `@tanstack/react-query`.
- Routing FE: `@tanstack/react-router`.
- Icon: `lucide-react`.
- QR: tiep tuc dung VietQR neu chot QR ngan hang Viet Nam; neu chi can QR text/link thi dung `qrcode.react` hoac `qr-code-styling`.
- Test: Vitest; can E2E thi them Playwright.
- Security: Cloudflare Turnstile cho login/public link, rate limit o Worker.
- Analytics: Cloudflare Web Analytics.

## Data model

### `users`

Tai khoan dang nhap.

- `id`
- `username`
- `password_hash`
- `created_at`
- `updated_at`

### `games`

Cuoc choi / nhom chia tien.

- `id`
- `owner_user_id`
- `code`
- `name`
- `created_at`
- `updated_at`

### `participants`

Nguoi tham gia trong mot cuoc choi.

- `id`
- `game_id`
- `name`
- `created_at`
- `updated_at`

### `expenses`

Khoan da chi.

- `id`
- `game_id`
- `payer_participant_id`
- `title`
- `amount`
- `note`
- `created_at`
- `updated_at`

### `expense_splits`

Danh sach nguoi phai chiu mot khoan chi.

- `id`
- `expense_id`
- `participant_id`
- `amount`

### `share_links`

Token public read-only.

- `id`
- `game_id`
- `token`
- `enabled`
- `created_at`
- `expires_at`

### `payment_profiles`

Thong tin nhan tien cua chu cuoc choi.

- `id`
- `game_id`
- `bank_id`
- `account_no`
- `account_name`
- `qr_type`
- `created_at`
- `updated_at`

## Luong tinh tien

Voi moi khoan chi:

1. Lay `amount`.
2. Lay danh sach nguoi duoc tick trong `expense_splits`.
3. Chia `amount / so nguoi duoc tick`.
4. Neu so tien le, phan du duoc cong lan luot cho cac nguoi dau danh sach de tong split luon bang tong tien goc.

Voi moi nguoi:

- `paid_total`: tong tien nguoi do da tra.
- `owed_total`: tong phan nguoi do phai chiu.
- `balance = paid_total - owed_total`.

Y nghia balance:

- `balance > 0`: duoc nhan lai.
- `balance < 0`: phai chuyen them.
- `balance = 0`: da can bang.

Sau khi co balance o V1:

1. Tao danh sach nguoi co `balance < 0`.
2. Moi nguoi trong danh sach chuyen so tien `abs(balance)` ve tai khoan chu cuoc choi.
3. QR VietQR lay tu `payment_profiles` cua cuoc choi.

## API de xuat

- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /games`
- `POST /games`
- `GET /games/:gameId`
- `PATCH /games/:gameId`
- `POST /games/:gameId/participants`
- `PATCH /participants/:participantId`
- `POST /games/:gameId/expenses`
- `PATCH /expenses/:expenseId`
- `DELETE /expenses/:expenseId`
- `GET /games/:gameId/summary`
- `POST /games/:gameId/share-links`
- `GET /share/:token`
- `POST /api/ai/expense`
- `POST /api/ai/receipt`
- `PUT /api/share/:token` khi link share có quyền edit

## Backend & deploy hien tai

Chi con **mot backend duy nhat**: Hono Worker trong `worker/`. Toan bo `/api/*`
(auth Better Auth, games/participants/expenses, summary, share, AI) do Worker xu
ly. Schema D1 quan ly bang Drizzle (`worker/src/db/schema.ts`, migration o
`drizzle/`).

Deploy qua **Cloudflare Pages** (khong dung GitHub Actions): Pages connect
GitHub, tu build + deploy khi push `main`. Pages Functions chi con mot shim
`functions/api/[[path]].ts` uy quyen moi request `/api/*` cho Hono app trong
`worker/` — nen khong con backend trung lap.

Pages settings:

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist`
- Compatibility flag: `nodejs_compat` (Better Auth can node builtins)
- D1 binding: `DB` -> `chiakeo-db`
- Secret: `BETTER_AUTH_SECRET` (bat buoc); `GEMINI_API_KEY` (tuy chon, bat AI);
  `GEMINI_MODEL` (tuy chon, mac dinh `gemini-2.0-flash`)

Config Worker/Pages nam trong `wrangler.jsonc` (va `wrangler.toml`). Migration D1:

```bash
pnpm db:migrate:remote   # wrangler d1 migrations apply DB --remote
```

## Bien moi truong de xuat

Frontend:

- `VITE_API_URL`
- `VITE_GOOGLE_AUTH_URL`
- `VITE_TURNSTILE_SITE_KEY`

Worker:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `TURNSTILE_SECRET_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- D1 binding: `DB`

## Bao mat

- Hash password qua Better Auth, khong tu luu plain password.
- Public share chi read-only.
- Token share nen du dai, random, co the disable hoac dat expiry.
- Rate limit cac endpoint login, tao game, tao public link.
- Validate input bang Zod o ca FE va Worker.
- Khong tin client-side amount/split khi tinh summary; backend tinh lai tu DB.

## Roadmap

1. ~~Tach routing FE sang TanStack Router.~~ Xong.
2. ~~Them form validation bang react-hook-form + zod.~~ Xong.
3. ~~Gop backend ve mot Worker (Hono) duy nhat, Pages uy quyen qua catch-all.~~ Xong.
4. ~~Bo sung migration Drizzle khi schema D1 thay doi.~~ Dang dung `drizzle/`.
5. ~~Them React Query cho cache/sync API.~~ Xong.
6. ~~Them Better Auth username/password.~~ Xong.
7. ~~Public share tren UI (bat/tat, doi token).~~ Xong.
8. ~~Chot QR: VietQR ngan hang Viet Nam.~~ Xong (`img.vietqr.io`).
9. ~~Them test cho logic split va settlement.~~ Xong (`pnpm test`).
10. ~~Cau hinh deploy Cloudflare (khong dung GitHub Actions).~~ Xong.

Con lai: rate limit + Turnstile o tang canh, dong bo lai tai lieu kien truc
(`docs/`) cho khop backend Worker.

## Lenh local

```bash
npm install
npm run dev
npm run build
```
