import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./worker/src/adapters/d1/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
