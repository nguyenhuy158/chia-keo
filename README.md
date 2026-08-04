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
  - Chia deu, chia theo so phan (weights) hoac nhap so tien cu the tung nguoi.
  - Ghi nhan tra no (reimbursement): danh dau mot khoan chuyen la "da tra",
    balance hai ben tu cap nhat, khong tinh vao tong chi.
  - Dùng Gemini để gợi ý khoản chi từ câu nhập nhanh hoặc ảnh hóa đơn.
  - Album ảnh cho từng cuộc chia (giống Tricount): thêm nhiều ảnh một lượt,
    đính kèm ảnh hóa đơn vào khoản chi, xem toàn màn hình (lướt, chú thích,
    tải về, xóa) và xem lại qua link share.
  - Lưu mẫu chi tiêu, xuất báo cáo text và xem thống kê nhanh.
- Tinh `da tra`, `phan chiu`, `con lai`.
- Toi gian cong no peer-to-peer: ghep nguoi am voi nguoi duong de so lan
  chuyen khoan it nhat (khong bat buoc chuyen ve chu cuoc choi).
  - Tạo link share dạng chỉ xem hoặc cho nhập thêm khoản chi qua `/share/:token`.
  - Tao VietQR bang `img.vietqr.io` neu nguoi nhan co du thong tin ngan hang.

## Kiến trúc hiện tại

Project áp dụng hexagonal architecture (ports & adapters) cho cả frontend lẫn
worker, domain kernel dùng chung nằm ở `shared/`.

```text
shared/              # Domain thuần dùng chung: split, schema, ai, DTO
src/
  core/
    domain/          # Rule thuần chỉ FE dùng (money)
    ports/           # GameApiPort (backend), QrProviderPort (QR)
    container.ts     # DI tối giản, main.tsx cắm adapter vào
  adapters/
    browser/         # fetch API, VietQR, Better Auth client, theme, nén ảnh
    react-query/     # Hook React Query bọc GameApiPort, upload ảnh
  components/ routes/  # Presentation
worker/src/
  core/
    ports/           # GameRepository (DB), AiProvider (AI)
    application/     # Use case: games, participants, expenses, share, ai
  adapters/
    d1/              # Drizzle schema + repository cho Cloudflare D1
    gemini/          # Gemini adapter cho AiProvider
  routes/            # Hono routes mỏng: parse -> use case -> JSON
```

Quy tắc chính:

- `core` không import adapter, không gọi `fetch`/driver DB/SDK ngoài.
- Business rule thuần ở `shared/` (dùng chung) hoặc `core/domain`.
- Nghiệp vụ backend ở `worker/src/core/application`, thao tác dữ liệu đi qua
  port `GameRepository`; route Hono chỉ parse input và map lỗi sang HTTP.
- Muốn thay DB/AI/QR/HTTP client: viết adapter mới implement port tương ứng,
  cắm ở composition root (`src/main.tsx`, `worker/src/lib/require-user.ts`).

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

Khoan da chi hoac khoan tra no.

- `id`
- `game_id`
- `payer_participant_id`
- `kind` (`expense` | `transfer`)
- `title`
- `amount`
- `note`
- `split_mode` (`equal` | `shares` | `amount`)
- `created_at`
- `updated_at`

### `expense_splits`

Danh sach nguoi phai chiu mot khoan chi.

- `id`
- `expense_id`
- `participant_id`
- `amount`
- `weight` (so phan khi `split_mode = shares`, null cho mode khac)

### `game_photos`

Anh cua mot cuoc chia (album chung hoac anh hoa don cua mot khoan chi).

- `id`
- `game_id`
- `expense_id` (null neu la anh chung cua cuoc chia)
- `caption`
- `mime_type`
- `width`, `height`
- `data` (base64 anh goc, canh dai toi da 1600px)
- `thumb_data` (base64 anh thu nho cho luoi anh)
- `created_at`

Anh duoc nen ngay o trinh duyet truoc khi gui len (JPEG, ha dan chat luong cho
den khi du nho), moi cuoc chia gioi han 60 anh de khong lam phinh D1. Danh sach
anh chi tra `thumb_data`; anh goc chi tai khi mo che do xem toan man hinh.

### `share_links`

Token public read-only.

- `id`
- `game_id`
- `token`
- `enabled`
- `created_at`
- `expires_at`

### `mcp_tokens`

Token cho endpoint MCP. Moi user tao duoc nhieu token, moi token mot bo quyen
rieng chon luc tao. Chi luu hash, ban goc hien dung mot lan roi khong lay lai
duoc.

- `id`
- `user_id`
- `name` — nhan de nhan ra token trong danh sach
- `token_hash` — SHA-256 hex cua token goc, unique
- `token_prefix` — vai ky tu dau de doi chieu (`ck_a1b2c3`)
- `scopes` — cac quyen, phan tach bang dau cach
- `created_at`
- `last_used_at`
- `expires_at` — null la khong tu het han
- `revoked_at` — null la con hieu luc

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

Voi moi khoan chi, phan chiu cua tung nguoi phu thuoc `split_mode`:

- `equal`: chia `amount / so nguoi duoc tick`; so tien le duoc cong lan luot
  cho cac nguoi dau danh sach de tong split luon bang tong tien goc.
- `shares`: chia theo so phan (`weight`) cua tung nguoi, phan du xu ly nhu tren.
- `amount`: nhap so tien cu the tung nguoi, tong cac phan phai bang `amount`.

Khoan tra no (`kind = transfer`) duoc luu nhu mot khoan chi ma nguoi nhan
chiu 100%: nguoi tra tang `paid`, nguoi nhan tang `owed`, nen balance hai ben
tu can bang lai. Transfer khong tinh vao `totalExpense`.

Voi moi nguoi:

- `paid_total`: tong tien nguoi do da tra.
- `owed_total`: tong phan nguoi do phai chiu.
- `balance = paid_total - owed_total`.

Y nghia balance:

- `balance > 0`: duoc nhan lai.
- `balance < 0`: phai chuyen them.
- `balance = 0`: da can bang.

Sau khi co balance, tinh danh sach chuyen khoan toi uu (peer-to-peer):

1. Ghep nguoi co `balance < 0` voi nguoi co `balance > 0` theo so tien giam dan,
   moi lan chuyen `min` cua hai ben cho den khi can bang het (toi da `n - 1`
   giao dich).
2. Tren UI chu cuoc choi co the bam "Đã trả" tren tung dong de ghi nhan
   khoan do thanh mot transfer.
3. QR VietQR lay tu `payment_profiles` cua nguoi nhan (neu du thong tin).

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
- `POST /games/:gameId/transfers`
- `GET /games/:gameId/photos`
- `POST /games/:gameId/photos`
- `GET /photos/:photoId` (kem anh goc)
- `PATCH /photos/:photoId` (chu thich, gan/go khoi khoan chi)
- `DELETE /photos/:photoId`
- `GET /games/:gameId/summary`
- `POST /games/:gameId/share-links`
- `GET /share/:token`
- `GET /share/:token/photos`
- `GET /share/:token/photos/:photoId`
- `POST /api/ai/expense`
- `POST /api/ai/receipt`
- `PUT /api/share/:token` khi link share có quyền edit
- `GET /api/mcp-tokens`, `POST /api/mcp-tokens`, `DELETE /api/mcp-tokens/:tokenId`
- `POST /api/mcp` — endpoint MCP, xem phan duoi

## MCP server

Cho phep Claude (Claude Code, Claude Desktop...) doc du lieu chia tien qua
[Model Context Protocol]. Endpoint: `POST /api/mcp`, transport **Streamable
HTTP** o che do stateless — moi POST la mot JSON-RPC message va nhan lai dung
mot JSON response, khong giu session va khong mo SSE (Pages Functions khong co
Durable Object de giu state).

[Model Context Protocol]: https://modelcontextprotocol.io

### Tool

Tool nao hien ra phu thuoc quyen cua token dang dung:

| Tool | Quyen can | Tra ve |
| --- | --- | --- |
| `list_games` | `games:read` | Danh sach cuoc chia kem ma, so nguoi, so khoan chi |
| `get_game` | `games:read` | Chi tiet mot cuoc chia (tra theo ma hoac id) |
| `get_summary_text` | `summary:read` | Ban tom tat dang chu, giong nut Copy trong app |
| `get_shared_game` | `share:read` | Cuoc chia bat ky qua token trong link share |

Tat ca deu chi doc. Muon them tool ghi thi khai bao scope moi o `MCP_SCOPES`
(`shared/schemas.ts`) va them tool voi `scope` do trong `worker/src/mcp/tools.ts`.

### Tao token

Chua co UI; tao bang API trong lúc dang dang nhap. Mo devtools console tren
trang web roi chay:

```js
await fetch("/api/mcp-tokens", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Claude Code ở máy bàn",
    scopes: ["games:read", "summary:read"],
    expiresInDays: null, // hoac so ngay, vd 30
  }),
}).then((r) => r.json());
```

Phan hoi co `secret` — **chi hien dung lan nay**, DB chi luu hash. Xem lai danh
sach token bang `GET /api/mcp-tokens` (khong bao gio kem secret), thu hoi bang
`DELETE /api/mcp-tokens/:tokenId`. Toi da 20 token con hieu luc moi user.

### Gan vao Claude Code

```sh
claude mcp add --transport http chia-keo https://chiakeo.huyab.click/api/mcp \
  --header "Authorization: Bearer ck_..."
```

Kiem tra nhanh khong can client MCP:

```sh
curl -s https://chiakeo.huyab.click/api/mcp \
  -H "Authorization: Bearer ck_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
```

### Bao mat

- Token 32 byte ngau nhien, tien to `ck_`; DB chi giu SHA-256 nen doc duoc
  database cung khong dung lai duoc token.
- Moi tool gioi han trong du lieu cua chu token; `get_shared_game` la ngoai le
  co y — no chi doc duoc cuoc chia da bat link share.
- Token sai/thu hoi/het han deu tra `401 unauthorized` giong nhau, khong he sai
  o dau. Tool ngoai quyen thi bao ro thieu scope nao de nguoi dung tao lai token.
- `/api/mcp` gioi han 120 POST/phut theo IP; `/api/mcp-tokens` dung han muc tao
  chung 30/phut.

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
