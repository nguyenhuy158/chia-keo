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

Không nằm trong danh sách ưu tiên nhưng đáng nhắc: kiểm tra lại contrast ở
dark mode sau khi các card mới (Danh bạ, Lịch sử, Thùng rác, ConfirmDialog)
được thêm dồn dập gần đây — chưa có ai xem qua bằng mắt trên thiết bị thật.
