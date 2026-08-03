// Port cho cache key-value luu payload JSON cua API ben ngoai (hien tai:
// danh ba ngan hang VietQR). Adapter hien tai la bang api_cache tren D1.

export type ApiCacheEntry = {
  payload: string;
  /** ISO timestamp luc fetch tu upstream. */
  fetchedAt: string;
};

export type ApiCache = {
  get(key: string): Promise<ApiCacheEntry | null>;
  set(key: string, entry: ApiCacheEntry): Promise<void>;
};
