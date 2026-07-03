# Kiến trúc

Project đang dùng hướng hexagonal nhẹ:

- `src/core/domain`: type và business rule thuần, không phụ thuộc browser hay service ngoài.
- `src/core/application`: use case điều phối domain, ví dụ encode/decode bản chia sẻ.
- `src/core/ports`: interface cho các adapter cần cắm vào core.
- `src/adapters/browser`: implementation phụ thuộc browser, localStorage, fetch, DiceBear, VietQR.
- `src/App.tsx`: presentation layer, chỉ gọi core/adapters qua entrypoint rõ ràng.
- `src/lib`: lớp compatibility re-export để import cũ và test cũ không gãy ngay.

Khi thêm logic mới:

- Tính toán, validate, phân loại: thêm vào `src/core/domain`.
- Use case kết hợp nhiều rule: thêm vào `src/core/application`.
- Gọi API, localStorage, QR, avatar, browser API: thêm vào `src/adapters/browser`.
- Không đưa `fetch`, `localStorage`, hoặc thư viện UI vào `src/core`.
