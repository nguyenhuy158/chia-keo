# MCP — việc còn lại

Trạng thái: MCP server đã chạy trên prod (`POST /api/mcp`), 4 tool chỉ đọc,
token bearer `ck_...` quản lý qua `/api/mcp-tokens`. Test đã phủ protocol,
transport và token. Danh sách dưới là phần làm cho hoàn thiện hơn, xếp theo
giá trị trên công sức.

Không tính UI quản lý token (`McpTokenPanel.tsx` + `SettingsPage.tsx`) — việc đó
theo dõi riêng.

## Nên làm ngay — rẻ, rủi ro thấp

- [ ] **CORS thiếu `MCP-Protocol-Version`** — `worker/src/index.ts:34`

  Prod hiện trả `access-control-allow-headers: Content-Type,Authorization`.
  Spec 2025-06-18 buộc client gửi header `MCP-Protocol-Version` ở mọi request
  sau `initialize`, nên client chạy trong trình duyệt (MCP Inspector, connector
  của claude.ai) fail ngay ở preflight. Claude Code không bị vì gọi từ Node,
  không qua CORS.

  Thêm `"MCP-Protocol-Version"` vào `allowHeaders`. Nhân đó kiểm tra luôn: nếu
  header có mà không nằm trong `SUPPORTED_PROTOCOL_VERSIONS` thì nên trả 400
  thay vì lặng lẽ xử lý.

- [ ] **`annotations` cho mỗi tool** — `worker/src/mcp/protocol.ts` (`describeTool`)

  Thêm `readOnlyHint: true` và `idempotentHint: true`. Client biết tool không
  sửa dữ liệu thì bớt chặn lại hỏi người dùng mỗi lần gọi.

- [ ] **`list_games` cần `limit` + `search`** — `worker/src/mcp/tools.ts`

  Đang trả về mọi cuộc chia. Hai cuộc thì không sao, năm mươi cuộc thì đổ hết
  vào context. Mặc định `limit: 20`, `search` khớp theo tên hoặc mã.

  Lưu ý `loadGame()` cũng đang `listGames()` toàn bộ rồi mới dò mã — nếu thêm
  phân trang thì đừng để nó dò trong trang đầu tiên là hết.

- [ ] **Validate args theo `inputSchema`** — `worker/src/mcp/tools.ts`

  `additionalProperties: false` đang được khai nhưng không ai enforce. Client
  gửi `{ gme: "DSKVUF" }` thì chỉ nhận được "Thiếu tham số game", không biết sai
  ở đâu. Repo có zod sẵn: gắn schema zod cho từng tool, sinh JSON Schema từ đó
  để khỏi khai hai lần.

## Đáng làm

- [ ] **`outputSchema` + `structuredContent`**

  `list_games` / `get_game` hiện nhét JSON vào một text block. Spec 2025-06-18
  có structured output — model parse chắc tay hơn, đỡ phải đoán. Đây là thứ cải
  thiện chất lượng câu trả lời rõ nhất trong danh sách.

  Vẫn phải giữ `content` text song song cho client cũ.

- [ ] **Rate limit theo token id, không chỉ IP** — `worker/src/index.ts:61`

  `rateLimitPost("mcp", ...)` đang key theo IP: cùng mạng công ty thì hai người
  chia nhau hạn mức, mà token bị lộ cũng không chặn riêng được. Key theo
  `tokenId` sau khi authenticate xong.

- [x] **Tool tổng hợp nhiều cuộc** — `get_balances_across_games`

  Gộp số dư nhiều cuộc theo từng người rồi tính một bộ chuyển tiền duy nhất.
  Trước đây phải gọi `get_game` từng cuộc rồi để model tự cộng — chậm và dễ sai.

  Chốt: **đối chiếu người theo tên**, chuẩn hoá hoa/thường và khoảng trắng
  nhưng *không* bỏ dấu — "Hương" và "Huong" có thể là hai người khác nhau thật,
  gộp sai thì ra số tiền sai chứ không chỉ hiển thị xấu. Bù lại, output có
  `namesInOneGameOnly` để người đọc tự nghi ngờ chỗ gõ tên lệch.

  Chặn ở `MAX_CROSS_GAME_GAMES = 8`: mỗi cuộc tốn 3 truy vấn D1 và Workers giới
  hạn subrequest mỗi request (50 ở gói miễn phí). Bỏ trống `games` thì lấy 8
  cuộc gần nhất và báo `omittedGameCount`, không lặng lẽ cắt.

## Việc lớn — chỉ làm nếu cần

- [ ] **OAuth 2.1**

  Bắt buộc nếu muốn thêm Chia Kèo làm Connector trên claude.ai hoặc Claude
  Desktop, vì mấy chỗ đó không cho tự đặt header Authorization. Bearer token
  tĩnh như hiện tại chỉ Claude Code CLI dùng được.

  Cần: `/.well-known/oauth-protected-resource`,
  `/.well-known/oauth-authorization-server`, dynamic client registration,
  authorization code + PKCE, và `WWW-Authenticate` trỏ về metadata. Việc nặng
  nhất trong file này.

## Đã cân nhắc và bỏ

- **Tool trả ảnh tổng kết** — MCP cho phép trả `{ type: "image", ... }`, nhưng
  không có gì tạo được PNG trên server: `renderSummaryImage()`
  (`src/adapters/browser/summary-image.ts:313`) dùng `document.createElement`
  và `document.fonts`, tức API trình duyệt, mà Workers runtime không có canvas
  2d. Binding Browser Rendering thì không dùng được trên Pages Functions —
  app đang deploy bằng Pages. Các đường còn lại: Worker riêng có browser binding
  (cần Workers Paid), hoặc viết lại renderer thành SVG trong `shared/` (phải tự
  tính chiều rộng chữ, nhúng font base64, ảnh lệch so với bản canvas). Bỏ qua:
  `get_summary_text` đã có đủ mọi con số trong ảnh.

- **Expose `resources`** — cho @-mention từng cuộc chia trong client. Hay nhưng
  chưa cần, `list_games` + `get_game` đủ dùng.
