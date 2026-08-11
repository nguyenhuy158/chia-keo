/**
 * Sinh shared/build-info.generated.ts truoc moi lan build/check/test.
 *
 * Muc dich: sau khi deploy, muon biet website dang chay code nao thi khong phai
 * doan — commit duoc dong cung vao bundle, doc lai qua GET /api/version hoac
 * tool MCP get_version. File nay khong commit (xem .gitignore) vi noi dung doi
 * theo tung lan build.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "shared", "build-info.generated.ts");
const UNKNOWN = "unknown";

/** Git thieu (vd. build tu tarball) thi van build duoc, chi la khong biet commit. */
function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/**
 * Workers Builds (CI) build tu git checkout detached, nen `rev-parse
 * --abbrev-ref` ra "HEAD" chu khong ra ten nhanh. CI dat san
 * WORKERS_CI_BRANCH va WORKERS_CI_COMMIT_SHA nen uu tien doc bien do.
 * CF_PAGES_* la di san tu thoi deploy bang Pages, giu lai cho chac.
 */
const env = process.env;
const commit =
  env.WORKERS_CI_COMMIT_SHA || env.CF_PAGES_COMMIT_SHA || git("rev-parse", "HEAD") || UNKNOWN;
const branchFromGit = git("rev-parse", "--abbrev-ref", "HEAD");
const info = {
  commit,
  shortCommit: commit === UNKNOWN ? UNKNOWN : commit.slice(0, 7),
  commitSubject: git("log", "-1", "--pretty=%s") || UNKNOWN,
  commitDate: git("log", "-1", "--date=iso-strict", "--pretty=%cd") || UNKNOWN,
  branch:
    env.WORKERS_CI_BRANCH ||
    env.CF_PAGES_BRANCH ||
    (branchFromGit === "HEAD" ? "" : branchFromGit) ||
    UNKNOWN,
  /** Phan biet bung tu CI (Workers Builds) voi `wrangler deploy` tay. */
  builtBy:
    env.WORKERS_CI === "1" || env.WORKERS_CI_BRANCH
      ? "workers-builds"
      : env.CF_PAGES === "1" || env.CF_PAGES_BRANCH
        ? "cloudflare-pages"
        : "local",
  // Build tu working tree con thay doi chua commit: code dang chay khong khop
  // hoan toan voi commit ghi o tren.
  dirty: git("status", "--porcelain") !== "",
  builtAt: new Date().toISOString(),
};

const contents = `// File nay do scripts/build-info.mjs sinh ra, dung sua tay.
import type { BuildInfo } from "./build-info";

export const BUILD_INFO: BuildInfo = ${JSON.stringify(info, null, 2)};
`;

// Chi ghi khi noi dung doi that: tranh lam vite/tsc rebuild vong quanh.
let current = "";
try {
  current = readFileSync(OUTPUT, "utf8");
} catch {
  current = "";
}

// builtAt luon doi nen so sanh phan con lai; lan dau (file chua co) thi cu ghi.
const withoutTimestamp = (text) => text.replace(/"builtAt": "[^"]*"/, "");
if (withoutTimestamp(current) !== withoutTimestamp(contents)) {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, contents);
}

console.log(
  `build-info: ${info.shortCommit}${info.dirty ? "-dirty" : ""} (${info.branch})`,
);
