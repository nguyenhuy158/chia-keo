/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_DEV_SERVER = "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    include: ["src/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
});
