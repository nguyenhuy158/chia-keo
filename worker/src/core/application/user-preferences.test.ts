import { describe, expect, it } from "vitest";
import type { GameRepository, UserPreferenceRow } from "../ports/game-repository";
import { getUserPreferences, updateUserPreferences } from "./user-preferences";

function createRepo(rows: UserPreferenceRow[]) {
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const repo = {
    userPreferences: {
      listByUser: async () => [...stored].map(([key, value]) => ({ key, value })),
      upsert: async (_userId: string, key: string, value: string) => {
        stored.set(key, value);
      },
    },
  } as unknown as GameRepository;

  return { repo, stored };
}

describe("user preferences", () => {
  it("tra ve mac dinh khi user chua luu gi", async () => {
    const { repo } = createRepo([]);
    expect(await getUserPreferences(repo, "u1")).toEqual({ preferences: { summaryShowQr: true } });
  });

  it("doc lai gia tri da luu", async () => {
    const { repo } = createRepo([{ key: "summaryShowQr", value: "false" }]);
    expect(await getUserPreferences(repo, "u1")).toEqual({ preferences: { summaryShowQr: false } });
  });

  it("bo qua dong hong hoac key la, khong lam vo phan con lai", async () => {
    const { repo } = createRepo([
      { key: "summaryShowQr", value: "{khong-phai-json" },
      { key: "tuyChonDaBo", value: "\"x\"" },
    ]);
    expect(await getUserPreferences(repo, "u1")).toEqual({ preferences: { summaryShowQr: true } });
  });

  it("ghi roi tra ve toan bo tuy chon", async () => {
    const { repo, stored } = createRepo([]);
    const result = await updateUserPreferences(repo, "u1", { summaryShowQr: false });

    expect(result).toEqual({ preferences: { summaryShowQr: false } });
    expect(stored.get("summaryShowQr")).toBe("false");
  });
});
