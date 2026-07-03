import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          avatar: ["@dicebear/core", "@dicebear/styles/lorelei-neutral.json"],
          router: ["react-router-dom"],
          validation: ["zod"],
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://127.0.0.1/",
      },
    },
    setupFiles: "./src/test/setup.ts",
  },
});
