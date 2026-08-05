# TODO: UI/UX cần tối ưu

Ghi lại lúc: 2026-08-05.

## 1. ~~Skeleton loader thay chữ "Đang tải..."~~ — Đã làm (2026-08-05)
`Skeleton`/`SkeletonCard`/`SkeletonListRow`/`SkeletonPhotoGrid` trong
`src/components/ui.tsx`, dùng ở GamesSidebar, TrashCard, ContactBookCard,
HistoryPanel, McpTokenPanel, PhotoPanel, SharePhotoGallery. Còn giữ nguyên
`LoadingState` chữ cho các trang full-page (GamePage, SharePage) và cho label
tiến trình upload ảnh thật ("Đang tải 2/5") — hai chỗ đó không phải khung chờ
ban đầu nên không cần mô phỏng hình dạng.

## 2. Sidebar nhớ trạng thái gấp/mở
`ContactBookCard` và `TrashCard` giờ có 4 card trong sidebar, mỗi lần load lại
trang thì `TrashCard` luôn về trạng thái gấp mặc định — đúng ý, nhưng nếu
người dùng hay mở ra xem thì phải bấm lại mỗi lần. Lưu trạng thái mở/gấp vào
localStorage theo key riêng từng card.

## 3. Avatar chữ cái đầu + màu riêng cho từng người
Danh sách người tham gia, dòng lịch sử, dòng chuyển tiền hiện toàn chữ trơn.
Một avatar tròn chữ cái đầu + màu cố định theo tên (hash tên -> màu trong một
bảng màu cố định, để cùng một người luôn cùng một màu xuyên suốt app) sẽ dễ
quét mắt hơn nhiều khi danh sách dài.

## 4. Vuốt để xoá trên mobile
Participant, contact, ảnh hiện đều xoá qua nút icon nhỏ. Thêm swipe-to-delete
(vuốt trái lộ nút xoá đỏ) cho danh sách trên mobile — pattern quen tay hơn so
với bấm trúng icon nhỏ bằng ngón tay.

## 5. Onboarding cho cuộc chơi mới toanh
Cuộc chơi vừa tạo, chưa có người/khoản chi thì các panel chỉ hiện trống trơn.
Thêm một empty-state hướng dẫn 3 bước: "1. Thêm người → 2. Thêm khoản chi →
3. Xem tổng kết", biến mất khi đã có ít nhất 1 người + 1 khoản.

---

Không nằm trong danh sách ưu tiên nhưng đáng nhắc: kiểm tra lại contrast ở
dark mode sau khi các card mới (Danh bạ, Lịch sử, Thùng rác, ConfirmDialog)
được thêm dồn dập gần đây — chưa có ai xem qua bằng mắt trên thiết bị thật.
