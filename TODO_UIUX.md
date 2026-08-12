# TODO: UI/UX cần tối ưu

Ghi lại lúc: 2026-08-05.

## 1. ~~Skeleton loader thay chữ "Đang tải..."~~ — Đã làm (2026-08-05)
`Skeleton`/`SkeletonCard`/`SkeletonListRow`/`SkeletonPhotoGrid` trong
`src/components/ui.tsx`, dùng ở GamesSidebar, TrashCard, ContactBookCard,
HistoryPanel, McpTokenPanel, PhotoPanel, SharePhotoGallery. Còn giữ nguyên
`LoadingState` chữ cho các trang full-page (GamePage, SharePage) và cho label
tiến trình upload ảnh thật ("Đang tải 2/5") — hai chỗ đó không phải khung chờ
ban đầu nên không cần mô phỏng hình dạng.

## 2. ~~Sidebar nhớ trạng thái gấp/mở~~ — Đã làm (2026-08-05)
`src/components/use-persistent-open.ts`: `useState` có nhớ qua localStorage,
thay `useState` thường ở `TrashCard` (key `trash`) và `HistoryPanel` khi
`collapsible` (key `history`, chỉ áp khi có nút gấp/mở — mobile luôn mở nên
không đụng tới).

**Ghi chú sửa lại cho đúng**: `ContactBookCard` thật ra không có nút gấp/mở
(luôn hiện hết), chỉ có form thêm người ẩn/hiện riêng — không phải trường hợp
cần nhớ trạng thái như mô tả ban đầu.

## 3. ~~Avatar theo tên~~ — Đã làm (2026-08-05), một phần
Dùng DiceBear (kiểu fun-emoji) thay vì chữ cái đầu — xem `docs/avatar-libs.md`
để biết lý do chọn và cách đổi lib khác. `src/components/Avatar.tsx` là điểm
chặn duy nhất, đã áp cho danh sách người tham gia và dòng chuyển tiền.

**Cố tình bỏ qua dòng lịch sử**: icon loại thao tác (thêm/xóa/sửa) ở đó đang
mang nhiều thông tin hơn mặt người, và nhiều dòng (đổi tên cuộc chia, đổi cách
chuyển tiền...) không gắn với đúng một người để gắn avatar.

## 4. ~~Vuốt để xoá trên mobile~~ — Đã làm (2026-08-05), một phần
`src/components/SwipeToDelete.tsx`: vuốt trái lộ nút xoá đỏ, bấm nút mới xoá
(2 bước liên tiếp, giống Mail — đủ để tránh vuốt nhầm mất dữ liệu). Chỉ bắt
cử chỉ chạm/bút cảm ứng (`pointerType`), chuột không kích hoạt gì — nút xoá có
sẵn cạnh mỗi dòng vẫn là đường duy nhất trên desktop, không đổi hành vi.

Áp cho: danh sách người tham gia (`ParticipantPanel`), danh bạ tự nhập
(`ContactBookCard`, chỉ dòng có trong bảng `contacts` — dòng suy ra từ lịch sử
không xoá được nên không vuốt được).

**Cố tình bỏ qua ảnh**: `PhotoGrid` không có nút xoá riêng trên mỗi ô — xoá
ảnh nằm trong màn xem toàn màn hình (`PhotoViewer`), không phải một dòng danh
sách để vuốt.

## 5. ~~Onboarding cho cuộc chơi mới toanh~~ — Đã làm (2026-08-05)
`src/components/OnboardingBanner.tsx`: 3 bước "Thêm người → Thêm khoản chi →
Xem tổng kết", bước nào xong tô xanh có dấu tick. Tự ẩn khi đã có ít nhất 1
người **và** 1 khoản chi. Hiện phía trên cả layout desktop lẫn mobile trong
`GamePage`, không phụ thuộc tab đang mở.

---

# Đợt 2 (2026-08-05) — rà soát sâu sau khi làm xong đợt 1

Đọc trực tiếp code (không đoán) theo 3 hướng: an toàn/phản hồi thao tác,
mobile/vùng chạm/accessibility, và visual/nhất quán câu chữ. Chưa cái nào
được làm — backlog để chọn dần.

## A. An toàn và phản hồi thao tác (nghiêm trọng nhất)

### A1. ~~Xoá người tham gia không có xác nhận~~ — Đã làm (2026-08-05)
`ParticipantPanel.tsx`: thêm `handleRemove()` dùng chung cho cả nút icon lẫn
`SwipeToDelete`, gọi `useConfirm()` trước khi `onRemove()` — nói rõ trong mô
tả là các khoản chi đã chia cho người này sẽ chia lại cho người còn lại. Cả
2 đường (icon + vuốt) giờ cùng đi qua một cổng chặn, không còn lối nào bấm
nhầm là mất luôn.

### A2. ~~Form Thêm/Sửa khoản chi và Thêm/Sửa người: lỗi mutation bay mất~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
Kiểm tra lại (2026-08-12) thấy `ExpensePanel.tsx` (`handleSubmit`) và
`ParticipantPanel.tsx` (`handleAdd`/`handleUpdate`) đã bọc `try/catch` quanh
`await onAdd(...)`/`await onUpdate(...)` từ trước, có `toast.error(...)` khi
lỗi. Mô tả gốc trỏ đúng vị trí (dòng số) nhưng nội dung đã lệch với code hiện
tại — chắc đã được sửa cùng đợt thêm `sonner`/`ConfirmDialog` mà chưa cập
nhật lại mục này. Không cần sửa thêm.

### A3. ~~Không có toast báo thành công cho thao tác cốt lõi~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
Grep lại đúng tên hàm app đang dùng (`toast` của `sonner`, không phải
`useToast` như TODO gốc ghi) thì cả `ExpensePanel.tsx` và
`ParticipantPanel.tsx` đều có `toast.success(...)`/`toast.error(...)` cho
thêm/sửa/xoá khoản chi và thêm/sửa/xoá người. `GamePage.tsx` cũng đã có
`toast.success(...)` cho đổi cách chia, đổi người nhận, bật/tắt link share,
đổi link share. Không còn thao tác cốt lõi nào thiếu toast. Không cần sửa
thêm.

### A4. ~~"Đổi link share" không xác nhận~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`GamePage.tsx`, `handleRotateShareLink`: đã gọi `confirm({ title: "Tạo link
chia sẻ mới?", description: "Link cũ sẽ hết hiệu lực ngay...", destructive:
true })` trước khi rotate, và `toast.success("Đã tạo link mới")` sau khi
xong. Có thể đã được thêm cùng đợt A1 (2026-08-05) mà TODO không cập nhật.
Không cần sửa thêm.

## B. Mobile, vùng chạm, accessibility

### B1. ~~`ConfirmDialog` nổi thấp hơn `ImageLightbox`~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`ConfirmDialog.tsx` đã dùng `z-[90]`, cao hơn `overlays.tsx` (ImageLightbox
`z-[80]`). Không cần sửa thêm.

### B2. ~~`ConfirmDialog` không có focus trap thật~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`ConfirmDialog.tsx` đã có `handleKey` lắng nghe `Tab`/`Shift+Tab`, query
`focusable` trong `dialogRef` và bọc vòng lại first/last khi ra khỏi hai
đầu — focus trap đúng chuẩn (không set `inert`, nhưng bọc vòng bằng Tab đã
đạt cùng mục tiêu là chặn Tab thoát khỏi dialog). Không cần sửa thêm.

### B3. ~~`Dropdown` không đóng khi mất focus bàn phím, không có mũi tên~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`Dropdown.tsx` đã có `onFocusOut` đóng dropdown khi Tab ra ngoài, và
`onKeyDown` xử lý `ArrowDown`/`ArrowUp` (di `activeIndex`) + `Enter` (chọn
option đang sáng) + `Escape` (đóng, trả focus về trigger). Không cần sửa
thêm.

### B4. ~~Vùng chạm dưới chuẩn 44px~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`TrashCard.tsx`, `ContactBookCard.tsx` đã dùng `h-11`/`h-10` cho các nút
hành động; `ContactPicker.tsx` chip đã đổi `py-3`. Không còn `h-9`/`h-8` nào
trong 3 file này. Không cần sửa thêm.

### B5. ~~Header (`AppLayout.tsx`) chật ở màn hình hẹp~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
Cụm nút phải đã đổi `gap-3` cố định thành `gap-1.5 sm:gap-3` (co lại ở màn
hẹp), có sẵn comment trong code ghi rõ đây là cách xử lý cho đúng vấn đề
TODO B5 nêu. Tên hiển thị (`{displayName}`) và nhãn "Thoát" đã ẩn dưới
`sm:`, chỉ còn cụm icon 44px cố định + logo co giãn bằng `truncate`. Không
cần sửa thêm.

### B6. ~~Nhãn bottom-nav chưa chặn xuống dòng~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`MobileGameNav.tsx` đã có `whitespace-nowrap` trên span nhãn. Không cần sửa
thêm.

### B7. ~~Không dialog nào trả focus về nút đã mở nó~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`overlays.tsx` đã có hook chung `useRestoreFocus(open)` (lưu
`document.activeElement` lúc mở, gọi lại `.focus()` lúc đóng), dùng ở cả
`BottomSheet`/`Drawer`/`ImageLightbox` và `ConfirmDialog.tsx`. Không cần sửa
thêm.

### B8. `Dropdown` thiếu ngữ nghĩa combobox chuẩn cho screen reader — Đã làm (2026-08-12), phần nhỏ hơn mô tả gốc
Kiểm tra lại: phần "Esc khi đang gõ ô tìm làm focus rơi về `<body>`" trong
mô tả gốc đã không còn đúng — `onKeyDown` xử lý `Escape` đã gọi
`triggerRef.current?.focus()` trước khi đóng, nên focus không bị mất. Phần
còn thiếu thật: `Dropdown.tsx` không có `role="listbox"`/`role="option"`/
`aria-activedescendant` nên trình đọc màn hình không công bố đúng số
lượng/vị trí trong danh sách. Đã thêm: `role="listbox"` trên `<ul>`,
`role="option"` + `id` khớp mẫu `${listId}-option-${index}` +
`aria-selected` trên từng option, `aria-activedescendant`/`aria-haspopup`
trên nút trigger trỏ tới option đang được `activeIndex` chọn. Chỉ kiểm bằng
đọc code (typecheck/test/build xanh) — chưa test bằng trình đọc màn hình
thật, vì môi trường này không có browser.

### B9. ~~Nút xoá ẩn trong `SwipeToDelete` vẫn nằm trong luồng Tab khi đóng~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`SwipeToDelete.tsx`: nút "Xóa" chỉ render khi `revealed` (đang mở hoặc đang
kéo) — `{revealed && <button>...}` — nên lúc đóng nút không tồn tại trong
DOM, không nằm trong luồng Tab, trình đọc màn hình không thấy. Không cần
sửa thêm.

### B10. ~~Nút gấp/mở thiếu `aria-expanded`~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`HistoryPanel.tsx`, `TrashCard.tsx` đã có `aria-expanded={open}` trên nút
"Ẩn"/"Xem". Không cần sửa thêm.

### B11. ~~`ConfirmDialog` thiếu `aria-describedby`~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`ConfirmDialog.tsx` đã có `aria-describedby={pending.description ?
"confirm-dialog-description" : undefined}` trỏ tới `<p id="confirm-dialog-
description">`. Không cần sửa thêm.

## C. Visual và nhất quán câu chữ

### C1. ~~Dòng "A trả B" tràn ngang khi tên dài~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`GameDashboard.tsx` dòng ~306-309: 2 `<span className="min-w-0 truncate">`
đã có `min-w-0`. Không cần sửa thêm.

### C2. Số tiền trong `ExpensePanel` không nổi bật như quy tắc còn lại của app — Đã làm (2026-08-12)
Danh sách khoản chi: số tiền chi (không phải thu) vẫn dùng
`text-sm font-semibold text-stone-950`, cùng cỡ/màu với tiêu đề khoản chi.
Đổi thành `text-sm font-bold text-violet-700 dark:text-violet-400`, khớp quy
ước `GameDashboard` (settlement dùng `font-bold text-violet-700`). Giữ
nguyên nhánh thu (`income`) đang dùng `emerald` để phân biệt thu/chi.

### C3. ~~Bo góc lệch tông ở `FunStatsPage`~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`StatCard` trong `FunStatsPage.tsx` đã dùng `rounded-lg`, khớp
`GamesSidebar`/`TrashCard`/`ContactBookCard`/`OnboardingBanner`. Không cần
sửa thêm.

### C4. ~~Hai hàm format ngày viết riêng, không dùng chung~~ — đã có sẵn, TODO cũ sai giả định (2026-08-12)
`HistoryPanel.tsx` và `McpTokenPanel.tsx` đã cùng import
`formatDateTime`/`formatTime` từ `format-datetime.tsx`, có tham số
`includeYear`. Không cần sửa thêm.

### C5. Số người/số khoản lặp lại 2 nơi khi đang mở một cuộc chơi — đã xem lại, giữ nguyên có lý do (2026-08-12)
`GamesSidebar.tsx` dòng game (`{game.participantCount} người,
{game.expenseCount} khoản`) và `Metric` trong `GameDashboard.tsx` ("Số
người"/"Khoản chi") đúng là cùng hiện một số liệu — nhưng hai chỗ phục vụ
hai bối cảnh khác nhau: sidebar là danh sách để *chọn* cuộc chơi (cần số
liệu ngắn để so sánh nhanh giữa các game), `Metric` là trang chi tiết *đang
mở* (cần số liệu làm điểm neo mở đầu trang). Bỏ một trong hai làm mất thông
tin hữu ích ở đúng bối cảnh đó; "liên kết trực quan" giữa 2 nơi không rõ sẽ
trông ra sao mà không thêm phức tạp không cần thiết (ví dụ animation
chuyển tiếp) cho lợi ích rất nhỏ. Quyết định: giữ nguyên, không phải bug.

---

Việc cũ chưa làm, gộp vào đây cho gọn: ~~kiểm tra lại contrast ở dark mode
sau khi các card mới (Danh bạ, Lịch sử, Thùng rác, ConfirmDialog) được thêm
dồn dập~~ — Đã làm (2026-08-12): `HistoryPanel.tsx` timestamp
`dark:text-stone-500` trên nền `stone-900` chỉ ~3.65:1 (dưới AA 4.5:1), đổi
về `stone-400` (~6.9:1). 3 card còn lại đã đo contrast, đạt chuẩn.

---

# Đợt 3 (2026-08-12) — perf & UX sau khi rà xong Đợt 2

## D1. ~~Không code-split theo route~~ — Đã làm (2026-08-12)
Toàn bộ route (`AppLayout.tsx` và các trang con) static-import — build ra
đúng 1 chunk JS 718KB (Vite tự cảnh báo "larger than 500 kB"). Trang ít dùng
(`FunStatsPage`, `McpTokenPanel`, `SharePage`) vẫn tải cùng bundle chính dù
người dùng không vào. ~~Fix: `React.lazy()` + `Suspense` cho từng route,
tách riêng chunk.~~ Đã dùng `lazyRouteComponent` của TanStack Router cho
`GamePage`/`SettingsPage`/`FunStatsPage`/`SharePage` (`src/router.tsx`),
kèm `defaultPendingComponent: LoadingState`. Main chunk 718KB → 587KB, thêm
4 chunk riêng (GamePage 71KB, SettingsPage 14KB, SharePage 12KB, FunStatsPage
3KB). Rủi ro kèm theo: sau deploy, client cũ giữ `index.html` cũ có thể gọi
chunk đã bị xoá trên CDN → `import()` reject. Đã kiểm bằng tay (xoá chunk,
curl lại): request rơi vào SPA fallback trả `index.html` (200, không phải
404 sạch), trình duyệt parse HTML như JS sẽ throw — promise vẫn reject nên
`rootRoute.errorComponent` ("Thử tải lại trang") vẫn bắt được. Chưa xác nhận
bằng mắt trên trình duyệt thật (không có công cụ browser trong phiên này).

## D2. Chỉ 1/20+ mutation có optimistic update — làm phần an toàn, phần còn lại hoãn có lý do
`src/adapters/react-query/queries.ts`: chỉ `useUpdatePreferences` có
`onMutate` cập nhật UI ngay rồi rollback nếu lỗi. Đã thêm `onMutate`/rollback
(qua option `optimistic` mới trong `useGameDetailMutation`) cho 4 mutation
KHÔNG đụng vào `summary` (balances/settlements do server tính bằng
`shared/split`, tự bịa optimistic dễ sai số): `useReorderExpenses`,
`useReorderParticipants`, `useRenameGame`, `useSetShareLinkEnabled`.

Còn lại — thêm/xoá khoản chi, thêm/xoá người tham gia — CHỦ ĐỘNG CHƯA LÀM:
`worker/src/core/application/game-detail.ts` gọi `calculateBalances`/
`calculateSettlements` từ `shared/split` để tính `summary`, nên về lý thuyết
FE có thể tái dùng đúng hàm đó để tự tính optimistic summary khớp server —
nhưng ghép đúng input (`ExpenseInput` → `ApiExpense` đầy đủ splits, id tạm
không đụng id thật khi reconcile...) là một thay đổi lớn, rủi ro sai số tiền
hiển thị sai trong lúc chờ. Để lại `isPending` (nút disable + spinner, form
giữ nguyên) thay vì optimistic giả — an toàn hơn cho app tiền bạc.

## D3. ~~Trang full-page vẫn dùng loader chữ, không phải skeleton~~ — Đã làm (2026-08-12)
`GamePage.tsx`/`SharePage.tsx` còn "Đang tải..." (cố tình bỏ ở Đợt 1 mục 1
vì lúc đó các list-level skeleton chưa xong hết). ~~Giờ phần lớn skeleton đã
có, có thể nâng cấp 2 trang full-page này luôn cho nhất quán.~~ Thêm
`GamePageSkeleton` (`src/components/ui.tsx`) tái dùng `Skeleton`/
`SkeletonCard`/`SkeletonListRow` có sẵn, giữ đúng bố cục header + danh sách +
thẻ tổng kết (`split` prop: `true` = 2 cột như GamePage, `false` = 1 cột như
SharePage) để không giật layout khi dữ liệu thật về.

## D4. ~~Contrast dark mode chưa rà hết toàn app~~ — Đã làm (2026-08-12)
Đợt 2 chỉ đo 4 card mới (Danh bạ, Lịch sử, Thùng rác, ConfirmDialog). ~~Còn
`GamesSidebar`, `McpTokenPanel`, `GameDashboard`, `ExpensePanel`... chưa đo.~~
Đo bằng công thức WCAG (giống Đợt 2) cho 4 file trên: tìm đúng 1 mẫu lỗi lặp
lại — `dark:text-stone-500` trên nền card (`stone-900`) chỉ ~3.65:1, dưới AA
4.5:1 — nhưng chỉ fix ở chỗ là NỘI DUNG thật (không phải icon trang trí/nút
disable): gợi ý tên "Người 1"…"Người N" (`GamesSidebar.tsx`), chữ "trả" giữa
2 tên trong khối tất toán (`GameDashboard.tsx`), nhãn "(tùy chọn)"/"(không
bắt buộc)" (`ExpensePanel.tsx`, 2 chỗ) — cả 4 đổi sang `stone-400` (~6.9:1).
Icon-only (nút kéo thả, nút xoá, mũi tên) giữ `stone-500`/`stone-600`: quy
ước có sẵn toàn app cho trạng thái phụ/trang trí, không phải lỗi mới.

## D5. ~~Confirm dialog cho thao tác có thể hoàn tác nên đổi thành toast-undo~~ — Đã làm (2026-08-12), phạm vi hẹp hơn mô tả gốc
Kiểm tra lại trước khi sửa thì đề bài ban đầu sai giả định:
- Xoá **khoản chi/giao dịch tất toán** (`ExpensePanel`, `GameDashboard`)
  KHÔNG có `ConfirmDialog` — bấm icon thùng rác là xoá ngay, không có lưới an
  toàn nào (không hỏi lại, không hoàn tác). Đây mới là chỗ đáng thêm
  toast-undo, cộng thêm chứ không phải thay thế.
- Xoá **người tham gia** (`ParticipantPanel`) có `ConfirmDialog`, nhưng
  `canUndoEvent` (`shared/game-events.ts`) chỉ coi `expense_removed` là hoàn
  tác được — `participant_removed` không có đường hoàn tác thật. Bỏ confirm
  ở đây sẽ kém an toàn hơn, không phải ngang bằng, nên GIỮ NGUYÊN.

Đã làm: `GamePage.tsx` thêm `handleRemoveExpense` dùng cho cả xoá khoản chi
và xoá giao dịch tất toán (2 chỗ `onRemove`/`onRemoveTransfer`, cùng gọi
`removeExpense` phía dưới) — xoá xong show `toast()` kiểu Gmail; nếu tìm được
đúng dòng lịch sử vừa tạo (khớp cả `title` + `amount`, không chỉ lấy dòng mới
nhất, để tránh hoàn tác nhầm) thì toast có nút "Hoàn tác" gọi
`useUndoGameEvent`, không thì chỉ show "Đã xóa" thường. Helper tra dòng lịch
sử mới (`findUndoableExpenseRemoval`) đặt ở `queries.ts`, gọi thẳng
`getGameApi().gameEvents.list()` (không qua cache) ngay sau khi xoá thành
công — không đổi API/backend, không thêm optimistic risk.

Các nút xoá còn dùng `ConfirmDialog` khác đều giữ nguyên, có lý do riêng:
`ParticipantPanel` (không hoàn tác được, giải thích trên), `TrashCard.
handlePurge` (xoá vĩnh viễn, code đã ghi rõ không hoàn tác), `handleDeleteGame`
(đã là xoá mềm có Thùng rác riêng, không cần thêm lớp undo nữa),
`handleRotateShareLink` (link cũ hết hạn ngay, không có gì để "hoàn tác").
