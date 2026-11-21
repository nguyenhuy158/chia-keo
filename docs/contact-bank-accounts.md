# Nhiều tài khoản ngân hàng trong danh bạ

Mỗi người trong Danh bạ lưu tối đa 20 tài khoản. Trong form sửa, chọn **Đặt mặc định**, rồi **Lưu**. Khi chọn người trong form thêm người vào kèo, STK mặc định được chọn trước; có thể chọn STK khác cho riêng lần thêm đó. Thay đổi Danh bạ không sửa STK của người đã có trong kèo.

## API và lưu trữ

`POST /api/contacts` và `PATCH /api/contacts/:id` nhận thêm `accounts: [{ bankId, accountNo, accountName }]`. Phần tử đầu tiên là mặc định; mảng rỗng xóa danh sách STK. Các cặp ngân hàng/STK phải khác nhau; ngân hàng và STK không được trống. Các trường đơn cũ luôn phản ánh mặc định.

Dữ liệu cũ có `bank_accounts = NULL` tiếp tục dùng ba trường đơn, không cần backfill. PATCH từ client cũ cập nhật tài khoản đầu tiên và giữ tài khoản khác. POST trùng tên từ client cũ không ghi đè danh sách STK đã thiết lập; client mới gửi `accounts` để thay danh sách.

## Phát hành

Áp dụng `drizzle-shared/0004_overjoyed_white_queen.sql` trên Turso production trước khi deploy Worker mới: chỉ thêm cột nullable, không xóa hay đổi STK hiện có. Dùng quy trình `pnpm db:migrate:remote` với biến môi trường đã xác thực. Local D1 dùng `pnpm db:migrate:local`. Rollback code giữ nguyên cột và dữ liệu mới; không drop cột.
