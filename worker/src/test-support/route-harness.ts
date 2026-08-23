// Ha tang chung cho test route: env gia va cac helper goi app.
//
// Cac test route tu khai vi.mock cho "../auth" (session) va
// "../adapters/d1/game-repository" (tra ve repo gia) — vi.mock bi hoist theo
// tung file nen khong dat chung o day duoc.

import type { Env } from "../env";
import { createFakeD1, type FakeD1Options } from "./fake-d1";

export const TEST_ORIGIN = "https://chia-keo.test";

export function createTestEnv(overrides: Partial<Env> = {}, d1?: FakeD1Options): Env {
  return {
    DB: createFakeD1(d1),
    BETTER_AUTH_SECRET: "secret-cho-test",
    BETTER_AUTH_URL: TEST_ORIGIN,
    ALLOWED_ORIGINS: TEST_ORIGIN,
    MAILER: { fetch: async () => new Response("{}") } as unknown as Fetcher,
    MAILER_KEY: "mailer-key",
    ...overrides,
  };
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

/** Goi mot endpoint cua app that; body object tu duoc JSON hoa. */
type TestableApp = {
  request: (input: string, init?: RequestInit, env?: Env) => Response | Promise<Response>;
};

export function callApi(
  app: TestableApp,
  path: string,
  options: RequestOptions = {},
  env: Env = createTestEnv(),
) {
  const { method = "GET", body, headers = {} } = options;

  return Promise.resolve(
    app.request(
      `${TEST_ORIGIN}${path}`,
      {
        method,
        ...(body === undefined
          ? {}
          : {
              body: JSON.stringify(body),
              headers: { "Content-Type": "application/json", ...headers },
            }),
        ...(body === undefined && Object.keys(headers).length > 0 ? { headers } : {}),
      },
      env,
    ),
  );
}

/**
 * Body JSON da ep kieu. `Response.json()` trong @cloudflare/workers-types tra
 * ve `unknown`, viet `as` o tung cho assert se rat on.
 */
export async function jsonBody<T = Record<string, never>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
