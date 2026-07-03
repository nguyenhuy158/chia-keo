# Chia Keo

Ung dung chia tien nhom cho cac buoi an, di choi, du lich hoac nhom chi tieu nho.

## Hien trang

- Frontend: React, Vite, TypeScript, Tailwind CSS.
- Luu tru: `localStorage`.
- Dang nhap hien tai: username/password local, chua co backend auth.
- Tinh nang dang co:
  - Tao nhieu cuoc choi.
  - Them nguoi tham gia va thong tin ngan hang.
  - Ghi khoan chi, nguoi tra tien, danh sach nguoi cung chia.
  - Tinh `da tra`, `phan chiu`, `con lai`.
  - Sinh danh sach chuyen khoan toi uu giua nguoi no va nguoi nhan.
  - Tao link share read-only dang `/share/:token`.
  - Tao VietQR bang `img.vietqr.io` neu nguoi nhan co du thong tin ngan hang.

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

Thong tin nhan tien cua tung nguoi.

- `id`
- `participant_id`
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

Sau khi co balance:

1. Tao danh sach nguoi no tu balance am.
2. Tao danh sach nguoi nhan tu balance duong.
3. Sap xep theo so tien giam dan.
4. Ghep nguoi no voi nguoi nhan, moi lan lay so tien nho hon giua hai ben.
5. Lap den khi het no hoac het nguoi nhan.

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

## Deploy flow

1. Code luu tren GitHub.
2. Cloudflare Pages connect GitHub de deploy FE tu dong khi push `main`.
3. API Worker deploy bang `wrangler deploy`.
4. Bind D1 vao Worker trong `wrangler.toml` hoac `wrangler.jsonc`.
5. Migration DB chay bang Drizzle.
6. Public link dang `/share/:token`, read-only, khong can login.

## Bien moi truong de xuat

Frontend:

- `VITE_API_URL`
- `VITE_TURNSTILE_SITE_KEY`

Worker:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `TURNSTILE_SECRET_KEY`
- D1 binding: `DB`

## Bao mat

- Hash password qua Better Auth, khong tu luu plain password.
- Public share chi read-only.
- Token share nen du dai, random, co the disable hoac dat expiry.
- Rate limit cac endpoint login, tao game, tao public link.
- Validate input bang Zod o ca FE va Worker.
- Khong tin client-side amount/split khi tinh summary; backend tinh lai tu DB.

## Roadmap

1. Tach routing FE sang TanStack Router.
2. Them form validation bang react-hook-form + zod.
3. Them Hono Worker API.
4. Them Drizzle schema va D1 migrations.
5. Thay `localStorage` bang API + React Query.
6. Them Better Auth username/password.
7. Them public share backed by DB.
8. Chot QR: VietQR ngan hang Viet Nam hay QR text/link thuong.
9. Them test cho logic split va settlement.
10. Cau hinh deploy Cloudflare Pages + Worker.

## Lenh local

```bash
npm install
npm run dev
npm run build
```

