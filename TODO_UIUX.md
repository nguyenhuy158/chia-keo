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

### A2. Form Thêm/Sửa khoản chi và Thêm/Sửa người: lỗi mutation bay mất, không ai biết
`ExpensePanel.tsx` (dòng 537, `handleSubmit`) và `ParticipantPanel.tsx`
(dòng 54, 74) gọi thẳng `await onAdd(...)`/`await onUpdate(...)` không bọc
`try/catch`. Mạng rớt hay server trả lỗi thì promise reject thành unhandled
rejection trong console, form đứng yên với dữ liệu đã nhập, **không có dòng
chữ nào báo lỗi** cho người dùng biết vì sao không lưu được. So sánh:
`ContactBookCard`, `TrashCard`, `McpTokenPanel` (viết sau, cùng đợt
ConfirmDialog) đều có `try/catch` + `toast(..., "error")` — hai form cũ và
dùng nhiều nhất trong app lại là hai cái thiếu.

### A3. Không có toast báo thành công cho phần lớn thao tác cốt lõi
Grep `useToast` trong `ExpensePanel.tsx` và `ParticipantPanel.tsx`: **0 kết
quả**. Thêm/sửa/xoá khoản chi, thêm/sửa/xoá người, đổi cách chuyển tiền, đổi
người nhận, bật/tắt link share, đổi link share (`GamePage.tsx` dòng
101-263) — không cái nào có `toast("Đã...")`. Người dùng phải tự nhìn danh
sách đổi để biết thao tác có chạy hay không, khác hẳn các flow mới hơn
(danh bạ, thùng rác, hoàn tác lịch sử) đều báo rõ.

### A4. "Đổi link share" không xác nhận dù làm link cũ hết hạn ngay lập tức
`GamePage.tsx` dòng 251: nút "Đổi link" chỉ có `title="Tạo token mới, link cũ
sẽ hết hiệu lực"` (tooltip, ít ai thấy) chứ không có confirm — bấm nhầm là cả
nhóm đang xem link cũ mất quyền xem ngay, phải xin link mới. Không nghiêm
trọng bằng A1 (không mất dữ liệu, chỉ mất quyền truy cập tạm thời) nhưng
cùng nhóm "thao tác một chiều không hỏi lại".

## B. Mobile, vùng chạm, accessibility

### B1. `ConfirmDialog` nổi thấp hơn `ImageLightbox` — z-index lệch thứ tự ưu tiên
`ConfirmDialog.tsx` dùng `z-[70]`, `overlays.tsx` (ImageLightbox) dùng
`z-[80]`. Về nguyên tắc confirm phải luôn nổi trên mọi overlay khác (nó là
cổng chặn cuối trước một hành động phá huỷ), nhưng hiện xếp thấp hơn
Lightbox. Hiện chưa có đường nào trigger confirm từ trong Lightbox nên chưa
vỡ thật, nhưng thứ tự z-index (`nav 40 < sheet/drawer 50 < confirm 70 <
lightbox 80`) sai logic ưu tiên, dễ vỡ khi thêm tính năng sau này. Sửa: nâng
`ConfirmDialog` lên `z-[90]`, cao nhất trong mọi overlay.

### B2. `ConfirmDialog` không có focus trap thật
`ConfirmDialog.tsx`: chỉ `confirmButtonRef.current?.focus()` một lần lúc mở,
không chặn Tab/Shift+Tab. Backdrop chỉ chặn click chuột, không set `inert`
lên phần còn lại của trang — người dùng bàn phím Tab được ra ngoài modal,
thao tác lên UI nền trong khi hộp thoại đang mở. Escape thì hoạt động đúng.

### B3. `Dropdown` không đóng khi mất focus bàn phím, không có điều hướng mũi tên
`Dropdown.tsx`: chỉ lắng nghe `mousedown` ngoài vùng để đóng — Tab ra khỏi
dropdown bằng bàn phím thì danh sách vẫn treo mở. Không có `ArrowDown/Up` +
`Enter` để duyệt/chọn option, chỉ click/chạm hoặc Tab tuần tự qua từng nút.

### B4. Vùng chạm dưới chuẩn 44px ở vài nút mới thêm
`TrashCard.tsx` (nút Phục hồi/Xoá hẳn, `h-9` = 36px), `ContactBookCard.tsx`
(nút Sửa/Xoá của mỗi dòng, `h-9 w-9`, đặt sát nhau không gap; nút "+" mở form
thêm chỉ `h-8` = 32px — nhỏ nhất app), `ContactPicker.tsx` (chip chọn người
quen `px-3 py-1.5 text-xs` ~ 28-30px cao). Phần còn lại của app dùng chuẩn
`h-11` (44px) cho nút hành động chính — mấy chỗ này lọt lưới.

### B5. Header (`AppLayout.tsx`) chật ở màn hình hẹp (~360px)
Cụm nút phải có 4 phần tử liền nhau đều `shrink-0`: link Thống kê vui
(44px), link Cài đặt (44px), ThemeToggle, nút Thoát — cộng gap tối thiểu
~200px chỉ riêng cụm này, trong khi máy màn 360px chỉ còn ~328px sau padding.
Tên hiển thị đã có `truncate` nhưng cụm icon không co giãn được.

### B6. Nhãn bottom-nav (`MobileGameNav.tsx`) chưa chặn xuống dòng
`<span className="text-[11px] font-medium">{section.label}</span>` không có
`whitespace-nowrap`, cột chỉ rộng ~75px (6 cột). Người dùng phóng to cỡ chữ
hệ thống (accessibility) dễ làm nhãn xuống 2 dòng, tràn khỏi `min-h-[3.5rem]`
cố định.

### B7. Không dialog nào trả focus về nút đã mở nó sau khi đóng
`ConfirmDialog.tsx`, `overlays.tsx` (BottomSheet/Drawer/ImageLightbox): không
lưu `document.activeElement` trước khi mở để khôi phục sau khi đóng (Esc, bấm
Huỷ/Đồng ý, bấm nền). Người dùng bàn phím mất tiêu điểm, phải Tab lại từ đầu
trang sau mỗi lần đóng — không rõ đang ở đâu trên trang.

### B8. `Dropdown` thiếu ngữ nghĩa combobox chuẩn cho screen reader
`Dropdown.tsx`: không có `role="listbox"`/`role="option"`/
`aria-activedescendant`, nên trình đọc màn hình không công bố đúng số
lượng/vị trí trong danh sách (ví dụ "3 trên 32"). Ngoài ra đóng bằng Esc khi
đang gõ ô tìm (`searchable`) thì input bị gỡ khỏi DOM ngay lập tức, focus rơi
hẳn về `<body>` — mất tiêu điểm bàn phím hoàn toàn, nặng hơn B3 đã ghi.

### B9. Nút xoá ẩn trong `SwipeToDelete` vẫn nằm trong luồng Tab khi đang đóng
`SwipeToDelete.tsx`: nút "Xóa" chỉ ẩn bằng vị trí (nằm ngoài vùng nhìn thấy
lúc chưa vuốt), không có `tabIndex={-1}`/`aria-hidden` khi đóng. Người dùng
Tab qua danh sách sẽ dừng ở một nút vô hình xen giữa các dòng, và trình đọc
màn hình vẫn đọc thấy "Xóa" dù không có gì hiện trên màn hình lúc đó.

### B10. Nút gấp/mở thiếu `aria-expanded`
`HistoryPanel.tsx`, `TrashCard.tsx`: nút "Ẩn"/"Xem" chỉ đổi chữ, không có
`aria-expanded` — sai mẫu ARIA disclosure widget chuẩn, trình đọc màn hình
không công bố đúng trạng thái đóng/mở, chỉ đọc lại nhãn chữ đã đổi.

### B11. `ConfirmDialog` thiếu `aria-describedby` cho phần mô tả
`ConfirmDialog.tsx`: `role="alertdialog"` chỉ có `aria-label` cho tiêu đề,
không trỏ `aria-describedby` tới đoạn `pending.description`. Một số trình đọc
màn hình bỏ qua phần mô tả khi công bố hộp thoại mới mở — với các mô tả quan
trọng như "Không lấy lại được" (Thùng rác xoá hẳn) thì đây là thông tin không
nên bị bỏ lỡ.

## C. Visual và nhất quán câu chữ

### C1. Dòng "A trả B" trong `GameDashboard` tràn ngang khi tên dài
Dòng ~304-309: 2 `<span className="truncate">` (tên người) nằm trong
`<p className="flex items-center gap-1.5 ...">` nhưng không có `min-w-0`
trên span — trong flexbox, `truncate` không tự co được nếu thiếu `min-w-0`.
Tên dài thật (không phải "Huy") sẽ đẩy tràn thay vì bị cắt "...". Đây là lỗi
tôi tạo ra khi thêm Avatar vào dòng này, chưa kiểm kỹ lúc đó.

### C2. Số tiền trong `ExpensePanel` không nổi bật như quy tắc còn lại của app
Danh sách khoản chi: tiêu đề khoản chi và số tiền dùng **cùng cỡ chữ, cùng
độ đậm, cùng màu** (`text-sm font-semibold text-stone-950`). So với
`GameDashboard` (số tiền settlement dùng `font-bold text-violet-700`, tách
hẳn khỏi tên người) — tiền là thông tin quan trọng nhất, đang không được
nhấn ở đúng chỗ nhiều người nhìn nhất (danh sách khoản chi).

### C3. Bo góc lệch tông ở `FunStatsPage`
`StatCard` (component mới nhất) dùng `rounded-xl`; toàn bộ card nội dung
phẳng khác trong app (`GamesSidebar`, `TrashCard`, `ContactBookCard`,
`OnboardingBanner`) dùng `rounded-lg`. `rounded-xl`/`rounded-2xl` trong app
hiện chỉ dành cho lớp phủ nổi (dialog, sheet, toast, menu) — StatCard không
phải overlay nên lệch quy ước.

### C4. Hai hàm format ngày viết riêng, không dùng chung
`HistoryPanel.tsx` (dòng 41-50) và `McpTokenPanel.tsx` (dòng 73-79) mỗi nơi
tự viết một hàm `Intl.DateTimeFormat`/`toLocaleString` khác nhau (một cái có
năm, một cái không). Không sai nhưng dễ trôi dần thành nhiều kiểu khi thêm
chỗ mới — nên gộp thành một helper dùng chung, có tham số bật/tắt năm.

### C5. Số người/số khoản lặp lại 2 nơi khi đang mở một cuộc chơi
Dòng game trong `GamesSidebar` (đang bôi tím vì active) và `Metric` trong
`GameDashboard` cùng hiện đúng một con số "khoản chi" — không sai nhưng thừa
phân cấp thông tin, hai nơi không liên kết trực quan với nhau.

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

## D4. Contrast dark mode chưa rà hết toàn app
Đợt 2 chỉ đo 4 card mới (Danh bạ, Lịch sử, Thùng rác, ConfirmDialog). Còn
`GamesSidebar`, `McpTokenPanel`, `GameDashboard`, `ExpensePanel`... chưa đo.

## D5. Confirm dialog cho thao tác có thể hoàn tác nên đổi thành toast-undo
Xoá người/khoản chi hiện chặn bằng `ConfirmDialog` (thêm 1 bước bấm trước
khi làm), nhưng app đã có sẵn hạ tầng hoàn tác (`HistoryPanel`,
`useUndoGameEvent`). Kiểu Gmail "Đã xóa — Hoàn tác" (toast có nút undo) đỡ
chặn luồng hơn modal, vẫn an toàn vì sửa được ngay sau đó.
