# MVP web — checklist nghiệm thu

## Phạm vi

Người dùng trên web đăng nhập, tạo cuộc chia, thêm người và thông tin nhận tiền, ghi khoản chi theo ba cách chia, xem số dư, ghi nhận đã trả, chia sẻ link chỉ xem và dùng VietQR để chuyển tiền. Số tiền là VND nguyên; tải lại trang không được đổi kết quả đã lưu.

Ứng dụng iOS và [E2E SSO iOS #30](https://github.com/nguyenhuy158/chia-keo/issues/30) nằm ngoài MVP web. AI, album ảnh và MCP đã có trong ứng dụng nhưng không phải điều kiện đóng milestone này. E2E ghi dữ liệu trên production được theo dõi riêng ở [#33](https://github.com/nguyenhuy158/chia-keo/issues/33).

## Checklist bắt buộc

- [x] **Đăng nhập web từ phiên mới:** đi từ `/login` qua SSO tới trang chủ, `/api/session` nhận đúng user, reload vẫn đăng nhập và đăng xuất hoạt động. [#31](https://github.com/nguyenhuy158/chia-keo/issues/31) ghi bằng chứng production ngày 2026-10-25; E2E local vẫn tạo session qua API Better Auth.
- [x] **Tạo cuộc chia và thêm người nhận tiền:** E2E local tạo game, thêm hai người, nhập ngân hàng/tài khoản cho một người. [Kịch bản UI](../e2e/ui-smoke.mjs), [CI](https://github.com/nguyenhuy158/chia-keo/actions/runs/40112382140).
- [x] **Chia đều và nhập số tiền từng người:** E2E xác nhận từng split, tổng chi, số dư và đề xuất chuyển khoản sau tải lại. [Bằng chứng #27](https://github.com/nguyenhuy158/chia-keo/issues/27).
- [x] **Chia theo số phần qua UI:** [PR #37](https://github.com/nguyenhuy158/chia-keo/pull/37) thêm E2E ba người chia 120.000 theo 1:2:3, kiểm split/weight, số dư, settlement, reload và input sai. Local E2E 22/22; [CI trên commit `0d4f80b`](https://github.com/nguyenhuy158/chia-keo/actions/runs/40150090906) xanh. Bằng chứng ở [#32](https://github.com/nguyenhuy158/chia-keo/issues/32).
- [x] **Ghi đã trả:** transfer được lưu, số dư về 0 sau reload và transfer không cộng vào tổng chi. [Bằng chứng #27](https://github.com/nguyenhuy158/chia-keo/issues/27).
- [x] **Link share chỉ xem:** E2E mở link bằng phiên vô danh, xem cuộc chia/ảnh và xác nhận không thể ghi game. [Kịch bản UI](../e2e/ui-smoke.mjs), [CI](https://github.com/nguyenhuy158/chia-keo/actions/runs/40112382140).
- [x] **VietQR cho người nhận đủ thông tin ngân hàng:** E2E thấy QR ở dòng chuyển tiền; unit test kiểm ngân hàng, tài khoản, số tiền và nội dung khi tạo URL. [Kịch bản UI](../e2e/ui-smoke.mjs), [test VietQR](../shared/vietqr.test.ts).
- [x] **Bảo vệ dữ liệu:** split sai tổng không làm đổi game; tài khoản khác và người xem share vô danh không sửa được. [Bằng chứng #27](https://github.com/nguyenhuy158/chia-keo/issues/27).
- [x] **Gate code trước merge:** baseline `main` `08c6afb` có 837 test, coverage 100% bốn chỉ số, type check/build và E2E local 19/19 xanh ([CI](https://github.com/nguyenhuy158/chia-keo/actions/runs/40112382140), [#22](https://github.com/nguyenhuy158/chia-keo/issues/22)). [PR #37](https://github.com/nguyenhuy158/chia-keo/pull/37) ở `0d4f80b` có Check và E2E smoke xanh ([CI](https://github.com/nguyenhuy158/chia-keo/actions/runs/40150090906)); gate trên commit `main` chốt được ghi tiếp ở [#20](https://github.com/nguyenhuy158/chia-keo/issues/20).
- [x] **Bản đang chạy được đối chiếu:** ngày 2026-10-25 production `/api/version` khớp `818c646`, `/api/health` báo API/DB khỏe; SSO từ phiên mới, trang chủ, reload và đăng xuất được kiểm chứng ở [#31](https://github.com/nguyenhuy158/chia-keo/issues/31). Bước SSO không tạo cuộc chia hoặc khoản chi production; đăng nhập đầu có thể tạo user D1.

## Quy tắc đóng MVP

[Milestone MVP web](https://github.com/nguyenhuy158/chia-keo/milestone/1) và [issue điều phối #20](https://github.com/nguyenhuy158/chia-keo/issues/20) chỉ đóng sau khi CI trên commit `main` chốt xanh và phiên bản production được đối chiếu lại. Bằng chứng Wrangler/D1 local không được gọi là E2E ghi dữ liệu production.

## Sau MVP

- [E2E local — Luồng chia tiền](https://github.com/nguyenhuy158/chia-keo/milestone/2) đã đóng cho phạm vi local và CI.
- [Web — Xác minh production](https://github.com/nguyenhuy158/chia-keo/milestone/3) theo dõi [#33](https://github.com/nguyenhuy158/chia-keo/issues/33); mọi thao tác ghi production cần phê duyệt riêng.
- [Web — Bảo mật và tài liệu](https://github.com/nguyenhuy158/chia-keo/milestone/4) theo dõi [Turnstile #34](https://github.com/nguyenhuy158/chia-keo/issues/34) và [đồng bộ kiến trúc #35](https://github.com/nguyenhuy158/chia-keo/issues/35).
