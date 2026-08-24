// Sinh lai bo icon PNG tu cac file SVG goc trong public/brand/.
// Chay: node scripts/render-brand.mjs
//
// Dung Chromium (qua playwright-core, da co san trong devDependencies) de
// rasterize: repo khong phu thuoc them sharp/resvg chi cho viec doi mot bo
// icon vai thang mot lan.
//
// Bien moi truong:
// - PLAYWRIGHT_CHROMIUM_PATH: duong dan chromium co san; bo trong de
//   playwright-core tu tim (can `npx playwright install chromium` truoc).
//
// Luu y: logo.svg co chu, ve dung font "Be Vietnam Pro" — trang render tai
// font tu Google Fonts nen may khong co mang se ra font fallback. Cac icon con
// lai thuan hinh, khong bi anh huong.
import { chromium } from "playwright-core";
import { mkdtemp, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BRAND = join(ROOT, "public", "brand");
const PUBLIC = join(ROOT, "public");

/** src: SVG goc, out: PNG dich, size: canh (px). */
const TARGETS = [
  { src: join(BRAND, "logo-mark.svg"), out: join(PUBLIC, "app-icon.png"), size: 512 },
  { src: join(BRAND, "logo-mark.svg"), out: join(PUBLIC, "pwa-192.png"), size: 192 },
  { src: join(BRAND, "logo-mark.svg"), out: join(PUBLIC, "apple-touch-icon.png"), size: 180 },
  { src: join(BRAND, "logo-maskable.svg"), out: join(PUBLIC, "maskable-512.png"), size: 512 },
  { src: join(PUBLIC, "favicon.svg"), out: join(PUBLIC, "favicon-32.png"), size: 32 },
  { src: join(BRAND, "logo.svg"), out: join(BRAND, "logo.png"), width: 880, height: 320 },
];

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700;800&display=swap";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--allow-file-access-from-files"],
});
const work = await mkdtemp(join(tmpdir(), "render-brand-"));

try {
  for (const t of TARGETS) {
    const width = t.width ?? t.size;
    const height = t.height ?? t.size;
    // <img> chu khong nhung inline: nhu vay Chromium ton trong viewBox cua SVG
    // thay vi tu quyet dinh kich thuoc noi tai.
    await copyFile(t.src, join(work, basename(t.src)));
    const page = join(work, `${basename(t.src)}.html`);
    await writeFile(
      page,
      `<!doctype html><html><head><meta charset="utf-8">
<link href="${FONT_CSS}" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:transparent;width:${width}px;height:${height}px;overflow:hidden}
img{display:block;width:${width}px;height:${height}px}</style>
</head><body><img src="./${basename(t.src)}"></body></html>`,
    );

    const tab = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await tab.goto(`file://${page}`);
    await tab.waitForLoadState("load");
    await tab.screenshot({ path: t.out, omitBackground: true });
    await tab.close();
    console.log(`${basename(t.out)} ${width}x${height}`);
  }
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
