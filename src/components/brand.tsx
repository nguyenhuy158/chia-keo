import { useId } from "react";

/**
 * Logo mascot cua Chia keo: hai nua vien keo nhin nhau — mot khoan duoc chia
 * cho hai nguoi. Ve theo huong kawaii-logo: khung bo tron, vien trang day,
 * gradient tim - hong, mat cuoi co diem sang va ma hong.
 *
 * Ve inline thay vi <img src="/brand/logo-mark.svg"> de khong ton mot request
 * cho thu luon xuat hien trong header. Ban file o `public/brand/logo-mark.svg`
 * la ban goc dung cho favicon, PWA icon va tai lieu — sua ben nao thi sua ca
 * ben kia.
 *
 * Gradient/filter id lay tu useId vi hai instance cung luc (header + trang
 * login) se trung id neu hard-code, khien instance sau nhan mau cua instance
 * truoc.
 */
export function BrandMark({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bg = `ck-bg-${uid}`;
  const glow = `ck-glow-${uid}`;
  const left = `ck-l-${uid}`;
  const right = `ck-r-${uid}`;
  const shadow = `ck-sh-${uid}`;

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
        <linearGradient id={bg} x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset=".5" stopColor="#c084fc" />
          <stop offset="1" stopColor="#f0abfc" />
        </linearGradient>
        <radialGradient id={glow} cx=".28" cy=".2" r=".75">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".34" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={left} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id={right} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#ffe4e6" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="9"
            stdDeviation="11"
            floodColor="#4c1d95"
            floodOpacity=".26"
          />
        </filter>
      </defs>

      <rect x="14" y="14" width="484" height="484" rx="136" fill={`url(#${bg})`} />
      <rect x="14" y="14" width="484" height="484" rx="136" fill={`url(#${glow})`} />
      <ellipse cx="176" cy="122" rx="104" ry="54" fill="#fff" opacity=".16" />
      <rect
        x="14"
        y="14"
        width="484"
        height="484"
        rx="136"
        fill="none"
        stroke="#fff"
        strokeWidth="24"
        strokeOpacity=".92"
      />

      <g
        transform="translate(256 256) scale(.92) translate(-256 -256)"
        filter={`url(#${shadow})`}
      >
        <g transform="rotate(-8 186 202)">
          <path
            d="M112 176 L52 152 q-13-5-9 9 l17 41 -17 41 q-4 14 9 9 l60-24 z"
            fill="#fde68a"
            stroke="#fff"
            strokeWidth="15"
            strokeLinejoin="round"
          />
          <circle cx="186" cy="202" r="80" fill={`url(#${left})`} stroke="#fff" strokeWidth="18" />
          <ellipse cx="162" cy="193" rx="9" ry="12.5" fill="#78350f" />
          <ellipse cx="214" cy="193" rx="9" ry="12.5" fill="#78350f" />
          <circle cx="165.5" cy="187.5" r="3.2" fill="#fff" opacity=".92" />
          <circle cx="217.5" cy="187.5" r="3.2" fill="#fff" opacity=".92" />
          <path
            d="M174 224 q14 16 28 0"
            fill="none"
            stroke="#78350f"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <ellipse cx="139" cy="219" rx="14" ry="8.5" fill="#fb7185" opacity=".55" />
          <ellipse cx="237" cy="219" rx="14" ry="8.5" fill="#fb7185" opacity=".55" />
        </g>
        <g transform="rotate(9 328 314)">
          <path
            d="M400 292 L458 270 q13-5 9 9 l-16 40 16 40 q4 14-9 9 l-58-23 z"
            fill="#fecdd3"
            stroke="#fff"
            strokeWidth="15"
            strokeLinejoin="round"
          />
          <circle cx="328" cy="314" r="74" fill={`url(#${right})`} stroke="#fff" strokeWidth="18" />
          <ellipse cx="306" cy="305" rx="8.5" ry="11.5" fill="#7f1d1d" />
          <ellipse cx="352" cy="305" rx="8.5" ry="11.5" fill="#7f1d1d" />
          <circle cx="309.5" cy="299.5" r="3" fill="#fff" opacity=".92" />
          <circle cx="355.5" cy="299.5" r="3" fill="#fff" opacity=".92" />
          <path
            d="M317 334 q11 15 22 0"
            fill="none"
            stroke="#7f1d1d"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <ellipse cx="285" cy="330" rx="13" ry="8" fill="#e11d48" opacity=".4" />
          <ellipse cx="373" cy="330" rx="13" ry="8" fill="#e11d48" opacity=".4" />
        </g>
      </g>

      <g fill="#fff">
        <path d="M382 138 l10 26 26 10 -26 10 -10 26 -10-26 -26-10 26-10 z" opacity=".95" />
        <path d="M132 356 l7 18 18 7 -18 7 -7 18 -7-18 -18-7 18-7 z" opacity=".72" />
      </g>
    </svg>
  );
}
