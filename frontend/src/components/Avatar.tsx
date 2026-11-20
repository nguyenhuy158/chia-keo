import { useEffect, useState } from "react";
import {
  getCachedAvatarUri,
  loadAvatarUri,
} from "../adapters/browser/avatar-uri";

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

export function Avatar({ name, size = 28, className = "" }: AvatarProps) {
  const [src, setSrc] = useState(() => getCachedAvatarUri(name, size));

  useEffect(() => {
    let active = true;
    setSrc(getCachedAvatarUri(name, size));
    loadAvatarUri(name, size).then((uri) => {
      if (active) setSrc(uri);
    });
    return () => {
      active = false;
    };
  }, [name, size]);

  const frameClassName = `shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 ${className}`;

  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`inline-block ${frameClassName}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      // Trang tri di kem ten hien thi ngay ben canh; screen reader doc ten do
      // roi, avatar noi lai la thua.
      aria-hidden="true"
      width={size}
      height={size}
      className={frameClassName}
    />
  );
}
