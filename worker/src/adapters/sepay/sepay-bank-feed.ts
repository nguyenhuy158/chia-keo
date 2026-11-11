import type { BankFeed, IncomingTransfer } from "../../core/ports/bank-feed";

const DEFAULT_SEPAY_API_BASE = "https://userapi.sepay.vn";
const REQUEST_TIMEOUT_MS = 8_000;
const ACCOUNT_CACHE_MS = 10 * 60_000;
const TRANSACTIONS_PAGE_SIZE = 100;
const MAX_TRANSACTION_PAGES = 5;
const VIETNAM_OFFSET_MS = 7 * 60 * 60_000;

type SepayAccount = { account_number: string; connection_type: string | null };
type SepayTransaction = {
  id: string;
  account_number: string;
  amount_in: number | string;
  transaction_content: string | null;
};
type SepayList<T> = {
  status: string;
  data: T[];
  meta?: { pagination?: { has_more?: boolean } };
};

let accountCache: { key: string; numbers: string[]; expiresAt: number } | null =
  null;

function toVietnamDateTime(iso: string) {
  return new Date(Date.parse(iso) + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function createSepayBankFeed(
  token: string,
  apiBase = DEFAULT_SEPAY_API_BASE,
): BankFeed {
  async function get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<SepayList<T>> {
    const url = `${apiBase}${path}?${new URLSearchParams(params).toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`SePay ${path} failed: ${response.status}`);
    const body = (await response.json()) as SepayList<T>;
    if (body.status !== "success")
      throw new Error(`SePay ${path} returned ${body.status}`);
    return body;
  }

  async function listTransactions(sinceIso: string) {
    const rows: SepayTransaction[] = [];
    for (let page = 1; page <= MAX_TRANSACTION_PAGES; page += 1) {
      const body = await get<SepayTransaction>("/v2/transactions", {
        transfer_type: "in",
        transaction_date_from: toVietnamDateTime(sinceIso),
        transaction_date_sort: "asc",
        per_page: String(TRANSACTIONS_PAGE_SIZE),
        page: String(page),
      });
      rows.push(...body.data);
      if (!body.meta?.pagination?.has_more) return rows;
    }
    console.warn(
      `SePay transactions truncated at ${MAX_TRANSACTION_PAGES} pages`,
    );
    return rows;
  }

  return {
    async listAccountNumbers() {
      const cacheKey = `${apiBase}|${token.slice(-6)}`;
      if (
        accountCache &&
        accountCache.key === cacheKey &&
        accountCache.expiresAt > Date.now()
      ) {
        return accountCache.numbers;
      }
      const accounts = await get<SepayAccount>("/v2/bank-accounts", {});
      const numbers = accounts.data
        .filter((account) => account.connection_type)
        .map((account) => account.account_number);
      accountCache = {
        key: cacheKey,
        numbers,
        expiresAt: Date.now() + ACCOUNT_CACHE_MS,
      };
      return numbers;
    },
    async listIncomingSince(sinceIso): Promise<IncomingTransfer[]> {
      const rows = await listTransactions(sinceIso);
      return rows.map((row) => ({
        id: row.id,
        accountNo: row.account_number,
        amount: Math.round(Number(row.amount_in)),
        content: row.transaction_content || "",
      }));
    },
  };
}
