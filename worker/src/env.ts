export type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  /** Danh sach origin FE duoc phep goi API, phan tach bang dau phay. */
  ALLOWED_ORIGINS?: string;
};
