import { z } from "zod";
import type { ApiBank } from "../../../../shared/api-types";
import { getFallbackVietQrBanks } from "../../../../shared/vietqr";
import type { ApiCache } from "../ports/api-cache";

export const VIETQR_BANKS_URL = "https://api.vietqr.io/v2/banks";

const BANKS_CACHE_KEY = "vietqr:banks";
/** Danh ba ngan hang hiem khi doi nen 7 ngay moi lam moi tu upstream. */
const BANKS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Chi giu cac truong can dung; item hong bi bo qua thay vi lam hong ca danh sach.
const upstreamBankSchema = z.object({
  bin: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional(),
  short_name: z.string().optional(),
  // 1 = ho tro chuyen khoan VietQR; cac bank khac khong tao duoc QR nhan tien.
  transferSupported: z.number().optional(),
});

const upstreamResponseSchema = z.object({ data: z.array(z.unknown()) });

const cachedBanksSchema = z.array(
  z.object({
    bin: z.string(),
    code: z.string(),
    shortName: z.string(),
    name: z.string(),
  }),
);

/** Loc + chuan hoa danh sach ngan hang tu payload cua api.vietqr.io. */
export function parseUpstreamBanks(payload: unknown): ApiBank[] {
  const response = upstreamResponseSchema.safeParse(payload);
  if (!response.success) return [];

  const banks: ApiBank[] = [];
  for (const item of response.data.data) {
    const bank = upstreamBankSchema.safeParse(item);
    if (!bank.success || bank.data.transferSupported === 0) continue;

    const shortName = bank.data.shortName || bank.data.short_name || bank.data.name;
    banks.push({
      bin: bank.data.bin,
      code: bank.data.code.toUpperCase(),
      shortName,
      name: bank.data.name,
    });
  }

  return banks.sort((a, b) => a.shortName.localeCompare(b.shortName, "vi"));
}

function parseCachedBanks(payload: string): ApiBank[] {
  try {
    const parsed = cachedBanksSchema.safeParse(JSON.parse(payload));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Danh sach da cache trong D1, khong goi upstream (dung cho route /qr). */
export async function getCachedBanks(cache: ApiCache): Promise<ApiBank[]> {
  const entry = await cache.get(BANKS_CACHE_KEY).catch(() => null);
  return entry ? parseCachedBanks(entry.payload) : [];
}

export type BankDirectoryDeps = {
  cache: ApiCache;
  /** Goi api.vietqr.io/v2/banks va tra ve JSON tho. */
  fetchUpstream: () => Promise<unknown>;
  now: () => number;
};

export type BankDirectoryResult = {
  banks: ApiBank[];
  source: "cache" | "upstream" | "stale-cache" | "fallback";
};

/**
 * Danh ba ngan hang cho dropdown: uu tien cache D1 con han, het han thi goi
 * upstream roi cache lai; upstream loi thi tra cache cu (stale) hoac danh sach
 * tinh du phong de dropdown khong bao gio trong.
 */
export async function getBankDirectory(deps: BankDirectoryDeps): Promise<BankDirectoryResult> {
  const entry = await deps.cache.get(BANKS_CACHE_KEY).catch(() => null);
  const cached = entry ? parseCachedBanks(entry.payload) : [];
  const fresh =
    entry !== null && deps.now() - Date.parse(entry.fetchedAt) < BANKS_TTL_MS;

  if (cached.length > 0 && fresh) return { banks: cached, source: "cache" };

  try {
    const banks = parseUpstreamBanks(await deps.fetchUpstream());
    if (banks.length === 0) throw new Error("empty_bank_list");

    await deps.cache.set(BANKS_CACHE_KEY, {
      payload: JSON.stringify(banks),
      fetchedAt: new Date(deps.now()).toISOString(),
    });

    return { banks, source: "upstream" };
  } catch (error) {
    console.error("VietQR bank directory fetch failed:", error);
    if (cached.length > 0) return { banks: cached, source: "stale-cache" };
    return { banks: getFallbackVietQrBanks(), source: "fallback" };
  }
}
