// Chay ca bo E2E mot lenh: build FE -> ap migration D1 local -> bat
// `wrangler dev` -> chay smoke suite -> tat server. Khong can chuan bi gi tay.
//
// Bien moi truong:
// - E2E_PORT: cong cho wrangler dev (mac dinh 8787)
// - E2E_SKIP_BUILD=1: bo qua `pnpm build` (dung khi ./dist da moi)
// - PLAYWRIGHT_CHROMIUM_PATH: chi dinh Chromium cu the
import { spawn } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const PORT = process.env.E2E_PORT || "8787";
const BASE = `http://127.0.0.1:${PORT}`;
const SERVER_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

/** Chay mot lenh den khi ket thuc; loi thi nem. */
function run(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, E2E_BASE_URL: BASE } });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} that bai (exit ${code})`)),
    );
  });
}

/** Doi tan server tra loi /api/version, hoac nem khi qua han. */
async function waitForServer(child) {
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`wrangler dev tat som (exit ${child.exitCode})`);
    try {
      const response = await fetch(`${BASE}/api/version`);
      if (response.ok) return;
    } catch {
      // Server chua san sang, thu lai.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`wrangler dev khong len sau ${SERVER_TIMEOUT_MS}ms`);
}

// `.dev.vars` chua BETTER_AUTH_SECRET; thieu no thi auth khong chay duoc.
if (!existsSync(".dev.vars")) copyFileSync(".dev.vars.example", ".dev.vars");

if (process.env.E2E_SKIP_BUILD !== "1") {
  await run("pnpm", ["build"], "build");
}
await run("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "DB", "--local"], "migration D1");

// `detached` cho server mot process group rieng: `pnpm exec` sinh them tang
// node con, kill rieng PID cha se bo mo coi wrangler/workerd giu cong.
const server = spawn(
  "pnpm",
  ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", PORT],
  { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, CI: "1" }, detached: true },
);

/** Gui signal toi ca process group cua server (bo qua neu da tat). */
function killServer(signal) {
  try {
    process.kill(-server.pid, signal);
  } catch {
    // Group da tat.
  }
}

// Group tach rieng nen Ctrl-C khong toi server: tu don truoc khi thoat.
process.once("SIGINT", () => {
  killServer("SIGKILL");
  process.exit(130);
});

let failed = false;
try {
  await waitForServer(server);
  console.log(`\nServer san sang tai ${BASE}, bat dau smoke suite\n`);
  await run("node", ["e2e/ui-smoke.mjs"], "smoke suite");
} catch (error) {
  failed = true;
  console.error("E2E FAIL:", error.message);
} finally {
  const exited = new Promise((resolve) => server.once("exit", () => resolve(true)));
  killServer("SIGTERM");
  // Cho wrangler don dep; qua han thi ket lieu de process khong treo.
  const stopped = server.exitCode !== null || (await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]));
  // Ket lieu ca group: wrangler co the tat truoc khi workerd con kip don.
  killServer("SIGKILL");
  if (!stopped) console.error("wrangler khong tat sau SIGTERM, da SIGKILL");
}

process.exit(failed ? 1 : 0);
