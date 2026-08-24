import { useId } from "react";

/**
 * Logo mascot cua Chia keo: hai nua keo dang duoc chia doi, ve theo huong
 * kawaii-logo (khung bo tron, vien trang day, mat cuoi + ma hong).
 *
 * Ve inline thay vi <img src="/brand/logo-mark.svg"> de khong ton mot request
 * cho thu luon xuat hien trong header, va de mau vien an theo currentColor
 * duoc neu sau nay can. Ban file o `public/brand/` la ban goc dung cho
 * favicon, PWA icon va README.
 *
 * Gradient id lay tu useId vi hai instance cung luc (header + trang login)
 * se trung id neu hard-code, khien instance sau nhan mau cua instance truoc.
 */
export function BrandMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bg = `ck-bg-${uid}`;
  const left = `ck-l-${uid}`;
  const right = `ck-r-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Chia kèo"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset=".55" stopColor="#c084fc" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
        <linearGradient id={left} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id={right} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#fecdd3" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>

      <rect x="14" y="14" width="484" height="484" rx="134" fill={`url(#${bg})`} />
      <rect
        x="14"
        y="14"
        width="484"
        height="484"
        rx="134"
        fill="none"
        stroke="#ffffff"
        strokeWidth="24"
        strokeOpacity=".9"
      />
      <ellipse cx="170" cy="120" rx="112" ry="60" fill="#ffffff" opacity=".2" />

      <path
        d="M266 104 V408"
        stroke="#ffffff"
        strokeWidth="15"
        strokeLinecap="round"
        strokeDasharray="4 34"
        opacity=".9"
      />

      <g transform="rotate(-9 178 214)">
        <path
          d="M96 184 L36 162 q-12-5-8 8 l16 44 -16 44 q-4 13 8 8 l60-22 z"
          fill="#fde68a"
          stroke="#ffffff"
          strokeWidth="15"
          strokeLinejoin="round"
        />
        <circle cx="178" cy="214" r="84" fill={`url(#${left})`} stroke="#ffffff" strokeWidth="18" />
        <ellipse cx="152" cy="204" rx="9" ry="13" fill="#78350f" />
        <ellipse cx="208" cy="204" rx="9" ry="13" fill="#78350f" />
        <path
          d="M164 238 q15 17 30 0"
          fill="none"
          stroke="#78350f"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <ellipse cx="127" cy="232" rx="15" ry="9" fill="#fb7185" opacity=".6" />
        <ellipse cx="231" cy="232" rx="15" ry="9" fill="#fb7185" opacity=".6" />
      </g>

      <g transform="rotate(11 344 320)">
        <path
          d="M412 296 L468 276 q12-4 8 8 l-14 36 14 36 q4 12-8 8 l-56-20 z"
          fill="#fecdd3"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinejoin="round"
        />
        <circle cx="344" cy="320" r="70" fill={`url(#${right})`} stroke="#ffffff" strokeWidth="17" />
        <ellipse cx="323" cy="311" rx="8" ry="11" fill="#7f1d1d" />
        <ellipse cx="365" cy="311" rx="8" ry="11" fill="#7f1d1d" />
        <path
          d="M333 340 q11 14 22 0"
          fill="none"
          stroke="#7f1d1d"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <ellipse cx="302" cy="337" rx="12" ry="7" fill="#e11d48" opacity=".45" />
        <ellipse cx="386" cy="337" rx="12" ry="7" fill="#e11d48" opacity=".45" />
      </g>

      <g fill="#ffffff">
        <path
          d="M366 128 l10 26 26 10 -26 10 -10 26 -10-26 -26-10 26-10 z"
          opacity=".95"
        />
        <path d="M126 372 l7 19 19 7 -19 7 -7 19 -7-19 -19-7 19-7 z" opacity=".8" />
        <circle cx="430" cy="196" r="9" opacity=".6" />
      </g>
    </svg>
  );
}
