export function BrandMark({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/pwa-192.png"
      width={size}
      height={size}
      alt="Chia kèo"
      className={className}
    />
  );
}
