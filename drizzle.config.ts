import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./worker/src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
