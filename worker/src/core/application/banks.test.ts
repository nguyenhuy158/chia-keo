import { describe, expect, it } from "vitest";
import type { ApiCache, ApiCacheEntry } from "../ports/api-cache";
import { getBankDirectory, getCachedBanks, parseUpstreamBanks } from "./banks";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-03T00:00:00Z");

const upstreamPayload = {
  code: "00",
  data: [
    {
      bin: "970436",
      code: "VCB",
      name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
      shortName: "Vietcombank",
      transferSupported: 1,
    },
    {
      bin: "546034",
      code: "CAKE",
      name: "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank",
      shortName: "CAKE",
      transferSupported: 1,
    },
    {
      bin: "999888",
      code: "NOQR",
      name: "Ngân hàng không hỗ trợ chuyển khoản",
      shortName: "NoQR",
      transferSupported: 0,
    },
    { thieu: "truong bat buoc" },
  ],
};

function createMemoryCache(initial: Record<string, ApiCacheEntry> = {}) {
  const store = new Map(Object.entries(initial));
  const cache: ApiCache = {
    async get(key) {
      return store.get(key) || null;
    },
    async set(key, entry) {
      store.set(key, entry);
    },
  };
  return { cache, store };
}

function cacheEntry(banks: unknown, fetchedAt: string): ApiCacheEntry {
  return { payload: JSON.stringify(banks), fetchedAt };
}

const cachedBanks = [{ bin: "970436", code: "VCB", shortName: "Vietcombank", name: "Vietcombank" }];

describe("parseUpstreamBanks", () => {
  it("bỏ bank không hỗ trợ chuyển khoản và item hỏng, sắp xếp theo shortName", () => {
    const banks = parseUpstreamBanks(upstreamPayload);

    expect(banks.map((bank) => bank.code)).toEqual(["CAKE", "VCB"]);
    expect(banks[1]).toMatchObject({ bin: "970436", shortName: "Vietcombank" });
  });

  it("payload sai shape trả về danh sách rỗng", () => {
    expect(parseUpstreamBanks(null)).toEqual([]);
    expect(parseUpstreamBanks({ data: "khong-phai-mang" })).toEqual([]);
  });
});

describe("getBankDirectory", () => {
  it("cache còn hạn: trả cache, không gọi upstream", async () => {
    const { cache } = createMemoryCache({
      "vietqr:banks": cacheEntry(cachedBanks, new Date(NOW - DAY_MS).toISOString()),
    });

    const result = await getBankDirectory({
      cache,
      fetchUpstream: async () => {
        throw new Error("khong duoc goi upstream");
      },
      now: () => NOW,
    });

    expect(result.source).toBe("cache");
    expect(result.banks).toEqual(cachedBanks);
  });

  it("cache hết hạn: gọi upstream rồi lưu lại vào cache", async () => {
    const { cache, store } = createMemoryCache({
      "vietqr:banks": cacheEntry(cachedBanks, new Date(NOW - 8 * DAY_MS).toISOString()),
    });

    const result = await getBankDirectory({
      cache,
      fetchUpstream: async () => upstreamPayload,
      now: () => NOW,
    });

    expect(result.source).toBe("upstream");
    expect(result.banks.map((bank) => bank.code)).toEqual(["CAKE", "VCB"]);
    expect(store.get("vietqr:banks")?.fetchedAt).toBe(new Date(NOW).toISOString());
  });

  it("upstream lỗi: trả cache cũ (stale) thay vì lỗi", async () => {
    const { cache } = createMemoryCache({
      "vietqr:banks": cacheEntry(cachedBanks, new Date(NOW - 30 * DAY_MS).toISOString()),
    });

    const result = await getBankDirectory({
      cache,
      fetchUpstream: async () => {
        throw new Error("mat mang");
      },
      now: () => NOW,
    });

    expect(result.source).toBe("stale-cache");
    expect(result.banks).toEqual(cachedBanks);
  });

  it("không có cache và upstream lỗi: trả danh sách tĩnh dự phòng", async () => {
    const { cache } = createMemoryCache();

    const result = await getBankDirectory({
      cache,
      fetchUpstream: async () => {
        throw new Error("mat mang");
      },
      now: () => NOW,
    });

    expect(result.source).toBe("fallback");
    expect(result.banks.some((bank) => bank.code === "VCB")).toBe(true);
  });

  it("upstream trả danh sách rỗng cũng coi như lỗi", async () => {
    const { cache } = createMemoryCache();

    const result = await getBankDirectory({
      cache,
      fetchUpstream: async () => ({ data: [] }),
      now: () => NOW,
    });

    expect(result.source).toBe("fallback");
  });
});

describe("getCachedBanks", () => {
  it("đọc danh sách từ cache, payload hỏng trả về rỗng", async () => {
    const good = createMemoryCache({
      "vietqr:banks": cacheEntry(cachedBanks, new Date(NOW).toISOString()),
    });
    const broken = createMemoryCache({
      "vietqr:banks": { payload: "khong-phai-json", fetchedAt: new Date(NOW).toISOString() },
    });

    expect(await getCachedBanks(good.cache)).toEqual(cachedBanks);
    expect(await getCachedBanks(broken.cache)).toEqual([]);
    expect(await getCachedBanks(createMemoryCache().cache)).toEqual([]);
  });
});
