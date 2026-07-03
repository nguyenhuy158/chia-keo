export type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  /** Danh sach origin FE duoc phep goi API, phan tach bang dau phay. */
  ALLOWED_ORIGINS?: string;
  /** API key Google Gemini; khong co thi cac endpoint /api/ai/* tra 400. */
  GEMINI_API_KEY?: string;
  /** Model Gemini, mac dinh gemini-2.0-flash. */
  GEMINI_MODEL?: string;
};
