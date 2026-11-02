import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("D1 schema", () => {
  it("resolves every declared table, index and foreign key", () => {
    const tables = Object.values(schema);
    const configs = tables.map((table) => getTableConfig(table));
    expect(configs.map((config) => config.name)).toContain("chiakeo_games");
    expect(configs.map((config) => config.name)).toContain("chiakeo_payment_profiles");
    expect(configs.flatMap((config) => config.indexes).length).toBeGreaterThan(
      10,
    );
    expect(
      configs.flatMap((config) => config.foreignKeys).length,
    ).toBeGreaterThan(10);
    expect(
      configs.flatMap((config) =>
        config.foreignKeys.map((key) => key.getName()),
      ),
    ).toContain("chiakeo_games_owner_user_id_chiakeo_user_id_fk");
  });
});
