import { afterEach, describe, expect, it, vi } from "vitest";
import { createSepayBankFeed } from "./sepay-bank-feed";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SePay bank feed", () => {
  it("doc so tai khoan va cache theo token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "success", data: [{ account_number: "0123" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const feed = createSepayBankFeed("token-cache-1", "https://sandbox.test");

    expect(await feed.listAccountNumbers()).toEqual(["0123"]);
    expect(await feed.listAccountNumbers()).toEqual(["0123"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sandbox.test/v2/bank-accounts?");
    expect(init.headers).toEqual({ Authorization: "Bearer token-cache-1" });
  });

  it("lay giao dich vao theo gio Viet Nam", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "success",
        data: [
          { id: "t1", account_number: "0123", amount_in: "100000.00", transaction_content: "CKABC" },
          { id: "t2", account_number: "0123", amount_in: 5, transaction_content: null },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const feed = createSepayBankFeed("token-2");

    expect(await feed.listIncomingSince("2026-11-11T15:00:00.000Z")).toEqual([
      { id: "t1", accountNo: "0123", amount: 100_000, content: "CKABC" },
      { id: "t2", accountNo: "0123", amount: 5, content: "" },
    ]);
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);
    expect(url.origin).toBe("https://userapi.sepay.vn");
    expect(url.searchParams.get("transaction_date_from")).toBe("2026-11-11 22:00:00");
    expect(url.searchParams.get("transfer_type")).toBe("in");
  });

  it("nem loi khi HTTP hoac status khong thanh cong", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));
    await expect(createSepayBankFeed("token-3").listAccountNumbers()).rejects.toThrow("401");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ status: "error", data: [] })));
    await expect(createSepayBankFeed("token-4").listIncomingSince("2026-11-11T00:00:00Z")).rejects.toThrow(
      "error",
    );
  });
});
