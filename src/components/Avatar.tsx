import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";
import { useMemo } from "react";
import { normalizeContactName } from "../../shared/contacts";

/**
 * Diem chan duy nhat cho avatar theo ten trong ca app (ParticipantPanel,
 * GameDashboard...). Doi lib/kieu thi sua o day, khong phai tung noi goi —
 * xem docs/avatar-libs.md cho ly do chon DiceBear va 2 lua chon con lai.
 */
type AvatarProps = {
  name: string;
  /** Duong kinh px. */
  size?: number;
  className?: string;
};

/**
 * Seed bang ten da chuan hoa (khong phan biet hoa/thuong, khoang trang) de
 * cung mot nguoi luon ra cung mot avatar du go hoa/thuong khac nhau —
 * `normalizeContactName` co san, dung lai chu khong tu viet ham thu hai.
 */
function buildAvatarDataUri(name: string, size: number): string {
  const seed = normalizeContactName(name) || "?";
  return createAvatar(funEmoji, { seed, size }).toDataUri();
}

export function Avatar({ name, size = 28, className = "" }: AvatarProps) {
  const src = useMemo(() => buildAvatarDataUri(name, size), [name, size]);

  return (
    <img
      src={src}
      alt=""
      // Trang tri di kem ten hien thi ngay ben canh; screen reader doc ten do
      // roi, avatar noi lai la thua.
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 ${className}`}
    />
  );
}
