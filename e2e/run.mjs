// Chay ca bo E2E mot lenh: build FE -> ap migration D1 local -> bat
// `wrangler dev` -> chay smoke suite -> tat server. Khong can chuan bi gi tay.
// Vong doi server (process group, Ctrl-C, SIGTERM roi SIGKILL) nam trong
// @huyab/e2e.
//
// Bien moi truong:
// - E2E_PORT: cong cho wrangler dev (mac dinh 8787)
// - E2E_SKIP_BUILD=1: bo qua `pnpm build` (dung khi ./dist da moi)
// - PLAYWRIGHT_CHROMIUM_PATH: chi dinh Chromium cu the
import { copyFileSync, existsSync } from "node:fs";
import { run, startServer } from "@huyab/e2e";

const PORT = process.env.E2E_PORT || "8787";
const BASE = `http://127.0.0.1:${PORT}`;
const SUITE_ENV = { E2E_BASE_URL: BASE };

// `.dev.vars` chua BETTER_AUTH_SECRET; thieu no thi auth khong chay duoc.
if (!existsSync(".dev.vars")) copyFileSync(".dev.vars.example", ".dev.vars");

if (process.env.E2E_SKIP_BUILD !== "1") {
  await run("pnpm", ["build"], { label: "build" });
}
await run(
  "pnpm",
  ["exec", "wrangler", "d1", "migrations", "apply", "DB", "--local"],
  {
    label: "migration D1",
  },
);

let server;
let failed = false;
try {
  server = await startServer({
    command: "pnpm",
    args: ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", PORT],
    readyUrl: `${BASE}/api/version`,
  });
  console.log(`\nServer san sang tai ${BASE}, bat dau smoke suite\n`);
  await run("node", ["e2e/readonly-smoke.mjs"], {
    label: "read-only smoke",
    env: SUITE_ENV,
  });
  await run("node", ["e2e/ui-smoke.mjs"], {
    label: "smoke suite",
    env: SUITE_ENV,
  });
} catch (error) {
  failed = true;
  console.error("E2E FAIL:", error.message);
} finally {
  await server?.stop();
}

process.exit(failed ? 1 : 0);
