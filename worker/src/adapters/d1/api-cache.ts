import { eq } from "drizzle-orm";
import type { ApiCache, ApiCacheEntry } from "../../core/ports/api-cache";
import type { Db } from "./game-repository";
import * as schema from "./schema";

/** Adapter D1 cho ApiCache: moi key mot dong trong bang api_cache. */
export function createD1ApiCache(db: Db): ApiCache {
  return {
    async get(key) {
      const row = await db
        .select()
        .from(schema.apiCache)
        .where(eq(schema.apiCache.key, key))
        .get();

      return row ? { payload: row.payload, fetchedAt: row.fetchedAt } : null;
    },

    async set(key, entry: ApiCacheEntry) {
      await db
        .insert(schema.apiCache)
        .values({ key, ...entry })
        .onConflictDoUpdate({ target: schema.apiCache.key, set: { ...entry } });
    },
  };
}
