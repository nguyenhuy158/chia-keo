import { useEffect, useState } from "react";

/** Cung moc `lg` cua Tailwind: tu day tro len la may tinh, duoi la dien thoai. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function readIsDesktop(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(readIsDesktop);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
