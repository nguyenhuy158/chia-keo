// D1 gia toi thieu: du cho cac cho con cham thang vao DB (health check,
// drizzle o route session) ma khong can dung mot database that.

type D1Rows = Record<string, unknown>[];

export type FakeD1Options = {
  /** Rows tra ve cho moi truy van; mac dinh rong. */
  rows?: D1Rows;
  /** Nem loi o moi truy van — de thu duong health check bao DB hong. */
  failing?: boolean;
};

export function createFakeD1(options: FakeD1Options = {}) {
  const rows = options.rows || [];

  const fail = () => {
    throw new Error("D1_ERROR: no such table");
  };

  const statement = {
    bind: () => statement,
    all: async () => (options.failing ? fail() : { results: rows, success: true, meta: {} }),
    first: async () => (options.failing ? fail() : (rows[0] ?? null)),
    run: async () => (options.failing ? fail() : { results: [], success: true, meta: {} }),
    raw: async () => (options.failing ? fail() : rows.map((row) => Object.values(row))),
  };

  return {
    prepare: () => statement,
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}
