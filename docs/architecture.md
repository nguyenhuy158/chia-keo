# Kiến trúc

Project đang dùng hướng hexagonal nhẹ:

```text
src/
  core/
    domain/
      types.ts
      split.ts
      statistics.ts
      money.ts
      expense-categories.ts
      schema.ts
    application/
      ai-expense.ts
      report.ts
      share-game.ts
    ports/
      game-repository.ts
  adapters/
    browser/
      remote-api.ts
      avatar.ts
      vietqr.ts
  lib/
    *.ts
  App.tsx
```

## Vai trò từng lớp

- `src/core/domain`: type và business rule thuần, không phụ thuộc browser hay service ngoài.
- `src/core/application`: use case điều phối domain, ví dụ encode/decode bản chia sẻ.
- `src/core/ports`: interface cho các adapter cần cắm vào core.
- `src/adapters/browser`: implementation phụ thuộc browser/service, `fetch`, DiceBear, VietQR.
- `src/App.tsx`: presentation layer, chỉ gọi core/adapters qua entrypoint rõ ràng.
- `src/lib`: lớp compatibility re-export để import cũ và test cũ không gãy ngay.

## Quy tắc phụ thuộc

Chiều phụ thuộc hợp lệ:

```text
App/UI -> adapters/browser -> core
App/UI -> core
src/lib -> core hoặc adapters/browser
```

Không làm:

- `src/core` import từ `src/adapters`.
- `src/core` import React component hoặc thư viện UI.
- `src/core` gọi `fetch`, `window`, `document`.
- Business rule mới đặt trực tiếp trong `src/App.tsx`.
- Logic mới đặt trong `src/lib`; `src/lib` chỉ re-export.

Khi thêm logic mới:

- Tính toán, validate, phân loại: thêm vào `src/core/domain`.
- Use case kết hợp nhiều rule: thêm vào `src/core/application`.
- Gọi API, QR, avatar, browser API: thêm vào `src/adapters/browser`.
- Không đưa `fetch` hoặc thư viện UI vào `src/core`.

## Checklist thêm tính năng

1. Xác định phần nào là domain rule.
2. Đặt domain rule vào `src/core/domain` và viết test thuần nếu có logic tính toán.
3. Nếu cần điều phối nhiều rule, tạo use case trong `src/core/application`.
4. Nếu cần browser/service ngoài, tạo adapter trong `src/adapters/browser`.
5. UI trong `src/App.tsx` chỉ gọi hàm từ core/adapters, không tự xử lý logic lớn.
6. Chạy `pnpm test` và `pnpm build`.

## Ví dụ mapping hiện tại

| Nhu cầu | File chính |
| --- | --- |
| Tính balance chia tiền | `src/core/domain/split.ts` |
| Format/parse VND | `src/core/domain/money.ts` |
| Phân loại chi tiêu | `src/core/domain/expense-categories.ts` |
| Thống kê nhanh | `src/core/domain/statistics.ts` |
| Validate game từ storage/share | `src/core/domain/schema.ts` |
| Parse draft khoản chi từ AI | `src/core/application/ai-expense.ts` |
| Tạo báo cáo text | `src/core/application/report.ts` |
| Encode/decode share token | `src/core/application/share-game.ts` |
| Gọi API backend | `src/adapters/browser/remote-api.ts` |
| Tạo avatar | `src/adapters/browser/avatar.ts` |
| Tạo VietQR | `src/adapters/browser/vietqr.ts` |
