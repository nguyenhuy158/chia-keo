# Repository Guidelines

## Project Structure & Module Organization

Chia Kèo splits group expenses after each play session and serves payment
QR codes; production is `chiakeo.huyab.click`. It is a React 19 + Vite +
Tailwind v4 frontend plus a Hono Cloudflare Worker backend on D1 (Drizzle),
both structured as hexagons (ports & adapters) around a shared pure
domain kernel in `shared/` (split math, zod schemas, AI normalization, DTOs).

Frontend: entry point `src/main.tsx` is the composition root that plugs
adapters into ports via `src/core/container.ts`. Pure FE-only rules live in
`src/core/domain/`, port interfaces in `src/core/ports/` (GameApiPort,
QrProviderPort). Implementations live in `src/adapters/browser/` (fetch API,
VietQR, Better Auth client, theme) and `src/adapters/react-query/` (React
Query hooks over GameApiPort). UI lives in `src/components/` and
`src/routes/`. Global styles live in `src/styles.css`, which imports the
design tokens in `src/styles/tokens.css` (a copy of ui-kit's tokens with
chia-keo's own violet/stone values); the HTML shell is `index.html`.

Worker: port interfaces in `worker/src/core/ports/` (GameRepository,
AiProvider), use cases and policies in `worker/src/core/application/`,
implementations in `worker/src/adapters/d1/` (drizzle schema + repository)
and `worker/src/adapters/gemini/`. Hono routes in `worker/src/routes/` are
thin driving adapters. `worker/src/mcp/` serves the stateless MCP endpoint
and `worker/src/sso.ts` verifies the `auth.huyab.click` SSO cookie. See
`docs/architecture.md` for dependency rules.

Folder structure:

```text
shared/                        # Pure domain kernel shared by FE + worker (no IO)
  split.ts                     #   Split math, balances, settlements, computeSplitRows
  schemas.ts                   #   Zod input schemas + domain constants
  ai.ts                        #   AI suggestion normalization/resolution (pure)
  contacts.ts                  #   Contact book helpers
  expense-categories.ts        #   Fixed expense-category enum
  fun-stats.ts                 #   Cross-game fun statistics
  game-events.ts               #   Game history event shapes
  photos.ts                    #   Photo helpers (counts, viewer index, data URI)
  api-types.ts                 #   DTOs exchanged between FE and worker
  rate-limit.ts                #   Pure rate-limit logic
  shuttles.ts                  #   Kho cau: cong tru so cau, chan kho am/vuot tran
  game-closing.ts              #   Dong cuoc choi: auto khi tra xong / dong tay
  vietqr.ts                    #   VietQR URL building (worker proxies QR too)
  summary-text.ts              #   Summary document for copy-as-text/image
  build-info.ts                #   Deployed commit (generated at build; GET /api/version)

src/                           # Frontend hexagon
  core/
    domain/money.ts            #   VND format/parse (FE-only pure rules)
    ports/game-api.ts          #   Backend API port
    ports/qr-provider.ts       #   Payment QR port
    container.ts               #   Minimal DI: provide*/get* per port
  adapters/
    browser/http-game-api.ts   #   fetch adapter for GameApiPort
    browser/vietqr.ts          #   VietQR adapter for QrProviderPort
    browser/auth-client.ts     #   Better Auth client
    browser/theme.ts           #   localStorage + matchMedia theme persistence
    browser/image.ts           #   Canvas photo compression before upload
    browser/clipboard.ts       #   Clipboard write with execCommand fallback
    browser/summary-image.ts   #   Draw the summary card to canvas -> PNG
    react-query/queries.ts     #   React Query hooks over GameApiPort
    react-query/photo-upload.ts#   Compress + upload photos with progress
  components/  routes/         #   Presentation (React)
  main.tsx                     #   Composition root: plugs adapters into ports

worker/src/                    # Backend hexagon (Hono on Cloudflare Worker)
  core/
    ports/game-repository.ts   #   Storage port (row types + interface)
    ports/ai-provider.ts       #   AI JSON-generation port
    application/               #   Use cases + policies (ownership, realloc, ...)
  adapters/
    d1/schema.ts               #   Drizzle schema (drizzle-kit source)
    d1/game-repository.ts      #   D1/drizzle adapter for GameRepository
    gemini/gemini.ts           #   Gemini adapter for AiProvider
  routes/                      #   Thin HTTP adapters: parse -> use case -> JSON
  mcp/                         #   Stateless Streamable HTTP MCP (POST /api/mcp)
  lib/                         #   Small infra: http helpers, ids, require-user
  auth.ts  env.ts  index.ts    #   Better Auth, Env type, app + middleware
  sso.ts  sso-user.ts          #   SSO cookie (RS256, JWKS) -> app user

drizzle/                       # Generated D1 migrations (wrangler migrations_dir)
scripts/                       # build-info.mjs (commit stamp), render-brand.mjs
docs/                          # architecture.md, brand/, screenshots/
e2e/                           # E2E (Playwright + wrangler dev)
  run.mjs                      #   `pnpm e2e`: build -> migrate D1 local -> serve -> smoke
  ui-smoke.mjs                 #   Smoke suite qua UI that (`pnpm e2e:smoke`)
  chromium.mjs                 #   Tim Chromium co san tren may/CI
```

## Build, Test, and Development Commands

- `pnpm install`: install project dependencies.
- `pnpm dev`: start the Vite development server on `127.0.0.1` (proxies
  `/api` to `wrangler dev` on `127.0.0.1:8787`).
- `pnpm dev:api`: run the Worker locally with `wrangler dev`.
- `pnpm check`: TypeScript project check (`tsc -b`) for app, node and worker.
- `pnpm lint`: Biome lint + format check (`biome check .`). The codebase
  predates Biome, so existing findings are not yet a CI gate.
- `pnpm format`: apply Biome formatting (`biome format --write .`).
- `pnpm build`: run TypeScript project build checks, then create the Vite
  production build.
- `pnpm test`: run the Vitest suite (`test:watch` for watch mode).
- `pnpm preview`: preview the production build locally on `127.0.0.1`.
- `pnpm db:generate`: generate a D1 migration from the Drizzle schema;
  `pnpm db:migrate:local` / `pnpm db:migrate:remote` apply migrations.
- `pnpm deploy`: build and `wrangler deploy` (normally CI deploys on push).
- `pnpm e2e`: run the Playwright smoke suite end to end. It builds the
  frontend, applies D1 migrations locally, boots `wrangler dev`, drives the
  real UI in Chromium, then shuts the server down. Set `E2E_SKIP_BUILD=1` to
  reuse an existing `dist/`, `E2E_PORT` to change the port.
- `pnpm e2e:smoke`: run only the smoke suite against a server you already
  started (`pnpm dev:api`), via `E2E_BASE_URL`.

Use `pnpm` for all package commands.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Prefer named exports for utilities
and type imports with `import type`. Follow the existing style: two-space
indentation, double quotes (enforced by `biome.json`), trailing commas where
already used, and concise function names such as `calculateBalances` or
`formatMoney`. React components
should use PascalCase file and component names, for example `App.tsx`. Do not
leave magic strings or magic numbers in code; extract them into clearly named
constants near the relevant module or in a shared constants file when reused.
Split complex logic into small, named functions with one clear responsibility.

Colors: use the ui-kit token classes (`bg-surface`, `bg-surface-muted`,
`border-border`, `text-fg-muted`, `bg-primary`, `text-danger`, `bg-*-soft`)
instead of a palette class + `dark:` pair whenever a token matches; dark mode
is the `.dark` class on `<html>` and the tokens switch with it. Keep token
names in sync with `ui-kit/src/styles/tokens.css`; change only values here.
Palette classes remain only where no token exists yet.

Hexagonal boundaries:

- Put pure rules, calculations, parsing, and schema validation shared by FE
  and worker in `shared/`; FE-only pure rules in `src/core/domain/`.
- Put backend business logic in `worker/src/core/application/`; data access
  goes through the `GameRepository` port, never inline SQL in routes.
- Put browser/service implementations in `src/adapters/*`; put DB/AI
  implementations in `worker/src/adapters/*`.
- Keep `fetch`, `window`, `document`, drizzle, VietQR, and UI libraries out
  of every `core/` and out of `shared/`.
- New swappable dependencies get a port in `core/ports/` plus an adapter,
  wired at the composition root (`src/main.tsx` or
  `worker/src/lib/require-user.ts`).

## Testing Guidelines

Tests use Vitest. Prefer colocated test files beside the related module, for
example `shared/split.test.ts` for shared domain math,
`src/core/domain/money.test.ts` for FE domain rules, or
`src/adapters/browser/vietqr.test.ts` for adapter logic. Prioritize coverage
for settlement math, split policies, and QR payload generation.

End-to-end coverage lives in `e2e/ui-smoke.mjs` and runs against the real
worker plus a local D1 database, so it catches wiring the unit tests cannot.
The suite creates its session through the Better Auth username/password API
(`/api/auth/sign-up/email`) because the login page only offers external SSO.
Prefer stable hooks in selectors — `aria-label`, form `placeholder`, or
`button[type="submit"]` — over bare visible text, which collides with the
onboarding chips. Confirmations are the in-app `ConfirmDialog`, not
`window.confirm`; accept them with the `acceptConfirm()` helper. Both CI jobs
(`check` and `e2e`) must be green before merging; a failed E2E run uploads
`e2e-failure.png` as an artifact.

## Commit & Pull Request Guidelines

Use Conventional Commits with an emoji and a scope, for example
`✨ feat(games): close a game automatically once settled` or
`🐛 fix(expense): handle empty participant split`. Pull requests should
include a short summary, test/build results, linked issue if available, and
screenshots for visible UI changes.

## Architecture Decisions & Pitfalls

Docs split, do not duplicate: dependency direction, the "Không làm" list and
the new-feature checklist live in [docs/architecture.md](docs/architecture.md);
data model, API list, MCP docs, brand/logo and roadmap live in
[README.md](README.md). This section only records **decision + why + trap**,
things reading the code does not show right away.

- **D1 riêng** (`chiakeo-db`, `d583fc77-...`), KHÁC app `notes` dùng D1 chung
  `db` — chia-keo có better-auth tự tạo bảng `user`/`session`/`account` tên
  trống trải, không tiền tố được, để chung là đụng tên app khác.
- **`nodejs_compat` là bắt buộc**, không phải bật cho vui: better-auth và
  drizzle đều import Node builtin. Bỏ flag là worker chết lúc boot.
- **`workers_dev = false`**, chỉ vào qua custom domain — cookie SSO
  (`huyab_sso`, domain `.huyab.click`) không gửi tới `*.workers.dev`, để bật
  là có URL đăng nhập được nửa vời.
- **Một Worker phục vụ cả API lẫn SPA**: `run_worker_first = ["/api/*"]` +
  `not_found_handling = "single-page-application"`. Không tách Pages riêng.
  Thêm route server mới PHẢI nằm dưới `/api/*`, nếu không asset handler nuốt
  trước và trả về `index.html`.
- **Hai đường đăng nhập chạy SONG SONG**: better-auth (username/mật khẩu) và
  SSO cookie RS256 từ `auth.huyab.click` (`worker/src/sso.ts`, JWKS cache ở
  module scope). Không cái nào thay cái nào — sửa auth phải kiểm cả 2 nhánh.
  (README nói chỉ có better-auth, đó là chỗ README đã cũ.)
- **CORS chỉ áp cho `/api/*`**, có `credentials: true` và cho phép header
  `Authorization` — cần cho MCP client chạy trong browser gửi bearer token.
- **MCP là Streamable HTTP KHÔNG state** (`POST /api/mcp`): không session,
  không SSE, không Durable Object — worker stateless thì rẻ và không phải
  trả tiền DO. Token `ck_...` chỉ lưu SHA-256, mất là cấp lại chứ không xem
  lại được. Thêm tool ghi phải sửa **2 chỗ**: `MCP_SCOPES` trong
  `shared/schemas.ts` và tool trong `worker/src/mcp/tools.ts`.
- **Ảnh lưu base64 THẲNG trong D1** (`data` + `thumb_data`), không R2 — nén
  bằng canvas ở browser trước khi gửi, trần 60 ảnh/cuộc
  (`MAX_PHOTOS_PER_GAME`). API list chỉ trả `thumb_data`, ảnh gốc phải xin
  riêng theo id. Đây là đánh đổi có ngưỡng rõ: quá 60 ảnh/cuộc thì phải
  chuyển sang R2, đừng nâng hằng số.
- **Rate limit fixed-window trong RAM** (`shared/rate-limit.ts`): đếm theo
  từng isolate, reset mỗi lần deploy, trần `MAX_TRACKED_KEYS = 10_000`. Chỉ
  chặn abuse thô, KHÔNG phải giới hạn toàn cầu — cần thật thì dùng Rate
  Limiting binding của Cloudflare.
- **Share token chỉ 4 ký tự** nên: (a) `share-links.ts` phải thử lại khi
  trùng, (b) có `SHARE_VIEW_RATE_LIMIT` = 20/phút riêng cho GET để chặn dò
  token. Hai nửa của cùng một quyết định, sửa cái này nhớ cái kia.
- **Tiền là VND số nguyên**, không float. Phần dư khi chia lẻ cộng 1 đồng cho
  những người đầu danh sách (ưu tiên người đang chia ít) để tổng split luôn
  khớp `amount`. Backend LUÔN tính lại split, không tin số client gửi.
- **`kind = 'transfer'` không tính vào `totalExpense`** — chuyển tiền là dòng
  tiền nội bộ, cộng vào là tổng chi phí phồng lên gấp đôi.
- **Trần số cuộc khi gộp**: `MAX_CROSS_GAME_GAMES = 8`,
  `MAX_FUN_STATS_GAMES = 20` — mỗi cuộc tốn ~3 truy vấn D1 và Workers giới
  hạn subrequest/request (50 ở gói free). Trần cứng, không phải phân trang.
- **Xoá mềm + Thùng rác**, giữ `TRASH_RETENTION_DAYS = 30`.
- **Đóng cuộc chơi có hai đường, KHÔNG trộn** (`shared/game-closing.ts`):
  `close_mode = 'auto'` là suy ra từ số tiền (mọi số dư về 0) nên tự mở lại
  khi số dư lệch trở lại; `'manual'` là ý muốn người dùng nên giữ nguyên dù
  còn nợ. Luật auto cắm ở `loadGameDetail` — chỗ duy nhất mọi mutation đi qua
  sau khi tính số dư, đừng rải lại ở từng use case. Bẫy: `listGames` giờ CHỈ
  trả cuộc đang chơi, nên mọi đường **tra cứu theo mã/id** (MCP) phải dùng
  `listAllGames`, không thì cuộc vừa tất toán thành "không tìm thấy".
- **Chia sẻ cuộc theo email** (`collaborators.ts`): mời được email chưa từng
  đăng nhập, lưu invite "chờ" (`userId` null), tự điền khi người đó đăng nhập.
- **Danh mục chi tiêu là enum cố định** (`shared/expense-categories.ts`),
  KHÔNG cho gõ tự do — "an uong"/"Ăn uống"/"ăn uong" thành 3 nhóm là biểu đồ
  vô nghĩa ngay. Chuỗi rỗng = "chưa phân loại" nên không cần migrate.
- **Lịch sử `game_events` cắt ở 200 dòng** (`GAME_EVENT_PAGE_SIZE`) — cũ hơn
  không ai cuộn tới.
- **`user_preferences` là key/value tự do** nên lúc đọc phải lọc: key lạ hoặc
  JSON hỏng thì bỏ qua và rơi về mặc định, không để một dòng rác làm vỡ cả
  màn hình.
- **QR VietQR proxy qua origin mình** (`worker/src/routes/qr.ts`): chỉ nhận
  tham số đã validate rồi TỰ dựng URL upstream, KHÔNG BAO GIỜ nhận URL từ
  client — nếu không endpoint này thành open proxy.
- **Brand: SVG là bản gốc**, PNG sinh ra bằng `node scripts/render-brand.mjs`
  (playwright-core Chromium). Đừng sửa tay PNG, lần render sau ghi đè hết.
- **Test dùng `fake-game-repository.ts`** (in-memory double) đặt cạnh use
  case, không mock từng hàm — port đã tách nên có sẵn chỗ cắm.

## Deploy & Production Checks

Setup commands are in [README.md](README.md). Every `pnpm` build/dev/test
script is prefixed with `node scripts/build-info.mjs`; building by hand
without it makes `/api/version` report a stale commit.

Pushing to `main` triggers Cloudflare Workers Builds (build + deploy), which is
not instant. Check whether prod really runs the new code:

```bash
curl https://chiakeo.huyab.click/api/version   # compare `commit` with `git rev-parse HEAD`
curl https://chiakeo.huyab.click/api/health    # ok:false + hint = migration not applied
```

A mismatched commit means the build has not finished yet; wait and re-check.

## Agent-Specific Instructions

Keep responses short and focused. If a requirement is unclear, ask before making
assumptions.
Design UI/UX to fit inside a single viewport by default. Avoid page-level
scrolling; use compact layouts, tabs, panes, or contained internal lists when
content can overflow.
