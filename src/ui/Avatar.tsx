import { cn } from "./cn";

/* Mau nen suy ra tu ten: cung mot nguoi luon ra cung mau o moi may, khong can
   luu gi trong DB. Chi doi hue, con do sang/bao hoa co dinh nen chu trang luon doc duoc. */
function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

/** Lay toi da 2 chu cai dau cua ten, bo dau cach thua. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZE = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };

export type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const base = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
    SIZE[size],
    className,
  );

  if (src) {
    return <img src={src} alt={name} className={cn(base, "object-cover")} />;
  }

  return (
    <span
      // role img + aria-label: screen reader doc ten nguoi thay vi doc 2 chu cai.
      role="img"
      aria-label={name}
      style={{ background: `oklch(55% 0.14 ${hueFromName(name)})` }}
      className={cn(base, "text-white")}
    >
      {initials(name)}
    </span>
  );
}
