import {
  DEFAULT_USER_PREFERENCES,
  userPreferencesSchema,
  type UserPreferences,
  type UserPreferencesPatch,
} from "../../../../shared/schemas";
import { nowIso } from "../../lib/ids";
import type { GameRepository, UserPreferenceRow } from "../ports/game-repository";

/**
 * Dong luu tru la key/value tu do nen luc doc phai loc: key la (ban cu, tuy
 * chon da bo) hoac JSON hong deu bi bo qua va rot ve mac dinh, thay vi lam
 * ca man hinh vo vi mot dong rac.
 */
function parseRows(rows: UserPreferenceRow[]): UserPreferences {
  const raw: Record<string, unknown> = {};

  for (const row of rows) {
    try {
      raw[row.key] = JSON.parse(row.value);
    } catch {
      // Gia tri hong: coi nhu chua tung luu.
    }
  }

  const parsed = userPreferencesSchema.partial().safeParse(raw);
  return { ...DEFAULT_USER_PREFERENCES, ...(parsed.success ? parsed.data : {}) };
}

export async function getUserPreferences(
  repo: GameRepository,
  userId: string,
): Promise<{ preferences: UserPreferences }> {
  return { preferences: parseRows(await repo.userPreferences.listByUser(userId)) };
}

/** Tra ve toan bo tuy chon sau khi ghi, de client khong phai goi lai GET. */
export async function updateUserPreferences(
  repo: GameRepository,
  userId: string,
  patch: UserPreferencesPatch,
): Promise<{ preferences: UserPreferences }> {
  const updatedAt = nowIso();

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    await repo.userPreferences.upsert(userId, key, JSON.stringify(value), updatedAt);
  }

  return getUserPreferences(repo, userId);
}
