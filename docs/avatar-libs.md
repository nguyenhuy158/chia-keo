# Thư viện tạo avatar theo tên

Ghi lại lúc: 2026-08-05. Đã chọn **DiceBear** (kiểu `fun-emoji`), dùng trong
`src/components/Avatar.tsx`. File này ghi lại 2 lựa chọn còn lại để sau này
đổi ý thì không phải tra cứu lại từ đầu.

Cả 3 đều sinh SVG ngay trên máy từ một chuỗi seed (không gọi API ngoài), và
đều **quyết định luôn** dựa trên tên: cùng một tên → luôn cùng một hình, không
cần lưu thêm cột nào trong DB.

## 1. DiceBear — đang dùng

```
pnpm add @dicebear/core@^9 @dicebear/collection@^9
```

```ts
import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";

const avatar = createAvatar(funEmoji, { seed: "Hồng", size: 32 });
const dataUri = avatar.toDataUri();
```

- ~20KB (core + một kiểu). Mặt biểu cảm dễ thương, đủ hoạt.
- **Đổi kiểu chỉ đổi import**: `@dicebear/collection` có sẵn hàng chục kiểu
  (`thumbs`, `adventurer`, `bottts`, `pixelArt`...) — đổi `funEmoji` thành kiểu
  khác trong `Avatar.tsx` là xong, không phải viết lại logic.
- Giấy phép theo từng kiểu (đa số MIT/CC0), xem cụ thể ở
  https://www.dicebear.com/licenses/.
- **Chú ý version**: `@dicebear/core` bản mới nhất trên npm là 10.x nhưng
  `@dicebear/collection` mới nhất chỉ ra tới 9.4.x và khai `peerDependencies`
  đòi core `^9`. Cài core 10 + collection 9 sẽ ra cảnh báo peer dependency lúc
  cài. Ghim cả hai về `^9` để tránh.

## 2. boring-avatars — nhẹ nhất, không dùng

```
pnpm add boring-avatars
```

Khối hình học trừu tượng (không phải khuôn mặt) — kiểu `beam` giống blob cười
2 mắt. ~7KB gzip, nhẹ hơn DiceBear đáng kể vì không có style riêng để tải.
MIT. Đáng cân nhắc lại nếu sau này thấy DiceBear nặng bundle hoặc muốn giao
diện tối giản hơn (không phải mặt người/emoji).

```tsx
import Avatar from "boring-avatars";

<Avatar size={32} name="Hồng" variant="beam" colors={PALETTE} />;
```

`colors` là bảng màu tự chọn (mảng hex) — không tự đẹp như DiceBear nếu không
tinh chỉnh, đổi lại nhẹ và không cần chọn "kiểu" (chỉ 1 thuật toán, nhiều biến
thể tô màu).

## 3. multiavatar — không dùng

```
pnpm add @multiavatar/multiavatar
```

Nhân vật hoạt hình đủ mặt/tóc/màu da — giống avatar "người thật" nhất trong 3
lựa chọn. **Không chọn vì**:

- Gói cài nặng ~2.7MB (nhúng sẵn hàng nghìn mảnh ghép SVG), gấp ~130 lần
  DiceBear và ~400 lần boring-avatars.
- Giấy phép ghi "SEE LICENSE IN LICENSE" — không phải MIT chuẩn, phải đọc kỹ
  điều khoản trước khi dùng cho sản phẩm có người dùng thật.
- Không chọn được kiểu khác (chỉ một thuật toán duy nhất).

## Cách đổi lib sau này

`Avatar.tsx` là điểm chặn duy nhất — mọi nơi trong app (`ParticipantPanel`,
`GameDashboard`) chỉ import `<Avatar name={...} size={...} />`, không import
trực tiếp DiceBear. Đổi lib chỉ cần sửa bên trong file đó, không phải sửa từng
chỗ gọi.
