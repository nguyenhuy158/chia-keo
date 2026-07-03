# UI patterns

## Pastel summary card

Pattern ap dung tu reference card pastel 4 dai mau ngang, bo goc lon va hang
metadata ben duoi.

Dang dung o:

- `src/App.tsx`: `PatternSummaryCard`
- `src/styles.css`: `.pastel-summary-pattern`

Quy uoc layout:

- Card ngoai: nen trang, border `stone-200`, shadow nhe, padding `16px`.
- Visual block: ti le `1 / 1`, full width, border radius `22px`.
- Metadata: nam duoi visual block, can giua theo chieu doc.
- Pill ben trai: icon heart + gia tri tong chi.
- Label ben phai: tuoi cua cuoc choi, vi du `Hom nay`, `3 ngay`, `2 thang`.

Bang mau:

| Token | Hex | Muc dich |
| --- | --- | --- |
| `pattern-pink` | `#ef70c8` | Dai tren cung, tao diem nhan |
| `pattern-rose` | `#f1a5b9` | Dai thu hai |
| `pattern-coral` | `#f8bcbc` | Dai thu ba |
| `pattern-cream` | `#fee8b7` | Dai duoi cung |

Ti le dai mau:

- `pattern-pink`: `0% - 41%`
- `pattern-rose`: `41% - 67%`
- `pattern-coral`: `67% - 85%`
- `pattern-cream`: `85% - 100%`

Khi reuse:

- Giu visual block khong co text noi len tren.
- Khong doi palette thanh mot mau don sac.
- Tren mobile, uu tien full width va khong ep 3 cot quanh card.
