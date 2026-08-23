// D1Database chay tren SQLite that (node:sqlite) — du de drizzle lam viec.
//
// Muc dich: test adapter D1 tren SQL THAT thay vi mock tung truy van. Mock se
// tra ve dung thu ta mong doi ke ca khi cau SQL sai; o day cau sai la loi
// ngay, va rang buoc khoa ngoai/cascade cung duoc kiem that.

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "drizzle";
/** drizzle-kit ngan cac cau lenh trong mot file migration bang dau nay. */
const STATEMENT_SEPARATOR = "--> statement-breakpoint";

function loadMigrationSql(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name: string) => name.endsWith(".sql"))
    .sort()
    .flatMap((name: string) =>
      readFileSync(join(MIGRATIONS_DIR, name), "utf8")
        .split(STATEMENT_SEPARATOR)
        .map((statement: string) => statement.trim())
        .filter(Boolean),
    );
}

/**
 * Tao D1 gia tren SQLite trong bo nho, da chay het migration cua repo.
 * Migration nao SQLite khong nuot (cu phap rieng cua D1) thi bo qua — schema
 * cuoi cung van du cho cac bang adapter dung.
 */
export function createSqliteD1() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");

  const skipped: string[] = [];
  for (const statement of loadMigrationSql()) {
    try {
      db.exec(statement);
    } catch (error) {
      skipped.push(`${statement.slice(0, 60)}: ${(error as Error).message}`);
    }
  }

  function prepare(sql: string) {
    return bound(sql, []);
  }

  function bound(sql: string, values: unknown[]) {
    const run = <T>(read: boolean, asArrays = false): T => {
      const prepared = db.prepare(sql);
      // Truy van co JOIN chon trung ten cot (id, name, created_at) — tra ve
      // object se gop cac cot trung lam mot va lam lech gia tri. Drizzle doc
      // ket qua JOIN qua raw() theo dung THU TU cot, nen phai lay dang mang.
      if (asArrays) prepared.setReturnArrays(true);
      // node:sqlite chi nhan null/number/string/bigint/Uint8Array.
      const params = values.map((value) =>
        value === undefined ? null : typeof value === "boolean" ? Number(value) : value,
      ) as never[];
      return (read ? prepared.all(...params) : prepared.run(...params)) as T;
    };

    return {
      bind: (...next: unknown[]) => bound(sql, next),
      all: async () => ({
        results: run<Record<string, unknown>[]>(true),
        success: true,
        meta: {},
      }),
      first: async (column?: string) => {
        const rows = run<Record<string, unknown>[]>(true);
        const row = rows[0] ?? null;
        return column && row ? row[column] : row;
      },
      run: async () => {
        const result = run<{ changes: number; lastInsertRowid: number }>(false);
        return {
          results: [],
          success: true,
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        };
      },
      raw: async () => run<unknown[][]>(true, true),
    };
  }

  const d1 = {
    prepare,
    batch: async (statements: { all: () => Promise<unknown> }[]) =>
      Promise.all(statements.map((statement) => statement.all())),
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;

  return { d1, sqlite: db, skippedMigrations: skipped };
}
