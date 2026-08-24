// Tim Chromium cho Playwright: uu tien bien moi truong, sau do cac thu muc
// browser cai san (image CI/dev container), cuoi cung de playwright-core tu tim.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BROWSER_ROOTS = [
  process.env.PLAYWRIGHT_BROWSERS_PATH,
  "/opt/pw-browsers",
  join(homedir(), ".cache", "ms-playwright"),
].filter(Boolean);

const BINARY_SUBPATHS = ["chrome-linux/chrome", "chrome-linux/headless_shell", "chrome", "headless_shell"];

/** Duong dan Chromium tim duoc, hoac undefined de playwright-core tu quyet. */
export function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  for (const root of BROWSER_ROOTS) {
    if (!existsSync(root)) continue;
    const entries = readdirSync(root).filter((name) => name.startsWith("chromium"));
    // Ban day du (chromium-*) truoc headless_shell de co day du tinh nang.
    entries.sort((a, b) => Number(b.startsWith("chromium-")) - Number(a.startsWith("chromium-")));
    for (const entry of entries) {
      for (const subpath of BINARY_SUBPATHS) {
        const candidate = join(root, entry, subpath);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}
