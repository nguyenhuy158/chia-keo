/**
 * Dau vet code dang chay: sinh luc build tu git (xem scripts/build-info.mjs) va
 * doc lai qua GET /api/version hoac tool MCP get_version, de kiem nhanh xem
 * website da deploy code nao.
 */
export type BuildInfo = {
  /** SHA day du cua commit luc build. "unknown" khi build ngoai git repo. */
  commit: string;
  shortCommit: string;
  commitSubject: string;
  /** ISO 8601 ngay commit (khong phai ngay build). */
  commitDate: string;
  branch: string;
  /** true = build tu working tree con thay doi chua commit. */
  dirty: boolean;
  builtAt: string;
};

export { BUILD_INFO } from "./build-info.generated";
