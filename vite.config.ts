/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API_DEV_SERVER = "http://127.0.0.1:8787";
const THEME_COLOR = "#faf5ff"; // Khop meta theme-color o index.html.

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Khong bat o `pnpm dev`: service worker cache se gay kho chiu khi dang
      // sua code (thay doi khong len ngay). Chi co trong ban build/deploy.
      devOptions: { enabled: false },
      // Deploy qua CI moi lan push (xem memory "Deploy qua Cloudflare Pages
      // CI"): ban moi tu thay the ban cu, khong hoi nguoi dung co tai lai
      // khong — khop cach app dang van hanh, khong can them UI xac nhan.
      registerType: "autoUpdate",
      // Tu goi registerSW() trong main.tsx thay vi de plugin tu chen script,
      // giu dung kieu composition-root tuong minh cua file do.
      injectRegister: false,
      manifest: {
        name: "Chia Kèo",
        short_name: "Chia Kèo",
        description: "Tính tiền nhóm và sinh QR nhận tiền.",
        lang: "vi",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png" },
          {
            // app-icon.png co san khoang dem quanh logo nen dung lai duoc
            // luon cho maskable, khong can ve rieng mot ban.
            src: "/app-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // SPA: duong dan khong khop file tinh nao thi tra ve index.html, tru
        // /api/* (khong phai navigation, nhung chan tuong minh cho chac).
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Co tinh KHONG cache /api/*: du lieu tien bac co mutation khap noi,
        // hien so cu luc mat mang con te hon khong hien gi. Mat mang thi giao
        // dien (shell) van len, chi phan lay du lieu moi bao loi nhu binh
        // thuong (da co EmptyState/error state san).
        //
        // Plugin chi tu bat 2 dong nay khi injectRegister la "auto"/null; o
        // day dang tat (goi registerSW tay trong main.tsx) nen phai tu khai
        // ro, khong thi SW moi mac dinh nam cho ("waiting") vo han cho den
        // khi nguoi dung dong het tab — registerType "autoUpdate" se khong
        // lam dung nhu ten goi.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    // Proxy API sang wrangler dev de FE va API cung origin khi phat trien.
    proxy: {
      "/api": {
        target: API_DEV_SERVER,
        changeOrigin: false,
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "shared/**/*.test.ts", "worker/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      // text de doc ngay o terminal/CI log; lcov cho editor va cac cong cu
      // bao cao; html de mo dist/coverage/index.html xem tung dong.
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage",
      // Chi do phan LOGIC THUAN: domain kernel dung chung, FE domain rules va
      // core cua worker. Component/route React, adapter IO (fetch, D1, canvas,
      // Gemini) khong nam trong pham vi vitest node nay — do chung vao chi lam
      // con so loang, khong noi len dieu gi ve chat luong luoi an toan.
      include: ["shared/**/*.ts", "src/core/**/*.ts", "worker/src/core/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        // Chi co type/interface, khong co dong lenh nao chay.
        "**/ports/**",
        // Sinh ra luc build (commit hash), khong phai code viet tay.
        "shared/build-info*.ts",
        // Composition root: chi noi day adapter, do bang e2e chu khong unit.
        "src/core/container.ts",
      ],
      // Nguong = muc dang dat, lam chot chong tut lui: them code khong kem
      // test se lam CI do. Nang dan len khi phu them cac use case con thieu
      // (muc tieu 90 — xem docs/testing.md).
      thresholds: {
        statements: 81,
        branches: 72,
        functions: 78,
        lines: 83,
      },
    },
  },
});
