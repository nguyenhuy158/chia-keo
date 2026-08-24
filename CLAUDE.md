# chia-keo

Chia tiền sau mỗi buổi chơi, `chiakeo.huyab.click`. React 19 + Vite +
Tailwind v4 + Cloudflare Worker (Hono) + D1 (Drizzle).

**Phân vai tài liệu — đừng viết trùng:**

- Cấu trúc thư mục, lệnh build/test, code style, Conventional Commits, luật
  UI "một viewport": [AGENTS.md](AGENTS.md).
- Chiều phụ thuộc hexagonal, danh sách "Không làm", checklist thêm tính năng:
  [docs/architecture.md](docs/architecture.md).
- Data model, danh sách API, tài liệu MCP, brand/logo, roadmap:
  [README.md](README.md).
- File này CHỈ ghi **quyết định + vì sao + bẫy** — thứ đọc code không thấy ngay.

## Quyết định kiến trúc

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

## Setup / deploy

Lệnh cụ thể xem [README.md](README.md). Mọi script `pnpm *` đều prefix
`node scripts/build-info.mjs` — chạy build tay mà bỏ bước này thì
`/api/version` trả commit cũ.

Push lên `main` là Cloudflare Workers Builds tự build + deploy, không có ngay.
Kiểm tra bản đã lên prod thật chưa:

```bash
curl https://chiakeo.huyab.click/api/version   # so `commit` với `git rev-parse HEAD`
curl https://chiakeo.huyab.click/api/health    # ok:false + hint = chưa apply migration
```

Commit chưa khớp nghĩa là build chưa xong, đợi rồi check lại.
