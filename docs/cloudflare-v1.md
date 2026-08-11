# Cloudflare deploy

App chay tren **mot Cloudflare Worker duy nhat** (`chiakeo`): Hono trong
`worker/` xu ly `/api/*`, file tinh do Vite build ra `dist/` va Worker tra ve
qua static assets, D1 `chiakeo-db` luu toan bo du lieu.

Truoc day project deploy bang Cloudflare Pages (Pages Functions shim
`functions/api/[[path]].ts`). Da bo — Pages khong tat duoc domain
`*.pages.dev` va Cloudflare khuyen dung Workers static assets.

Toan bo config nam trong `wrangler.toml`:

- `main = "worker/src/index.ts"` — entry Worker.
- `[assets]` `directory = "./dist"`, `not_found_handling =
  "single-page-application"` (SPA fallback cho `/share/:token`),
  `run_worker_first = ["/api/*"]` — chi `/api/*` vao Worker, con lai tra file
  tinh.
- `workers_dev = false` + `routes` — chi phuc vu qua `chiakeo.huyab.click`.
- Binding `DB` (D1) va `MAILER` (service binding toi Worker `mailer`).

## Cach 1: Workers Builds (CI, dang dung)

Cloudflare Dashboard > Workers & Pages > `chiakeo` > Settings > Builds >
Connect to Git, chon repo `nguyenhuy158/chia-keo`:

- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `npx wrangler deploy`

Push `main` la tu build + deploy. CI dat san `WORKERS_CI_BRANCH` va
`WORKERS_CI_COMMIT_SHA`; `scripts/build-info.mjs` doc hai bien nay de
`GET /api/version` bao dung commit dang chay.

## Cach 2: Wrangler deploy tu local

```bash
npx wrangler login
pnpm deploy              # = pnpm build && wrangler deploy
```

## Secret

Dat truoc khi deploy lan dau (giu nguyen qua cac lan deploy sau):

```bash
npx wrangler secret put BETTER_AUTH_SECRET   # bat buoc, ky session Better Auth
npx wrangler secret put MAILER_KEY           # phai khop INTERNAL_API_KEY cua Worker mailer
npx wrangler secret put GEMINI_API_KEY       # tuy chon, bat AI nhap nhanh + OCR hoa don
```

`GEMINI_MODEL` (tuy chon, mac dinh `gemini-2.0-flash`) va `ALLOWED_ORIGINS`
khong phai secret, dat trong `[vars]` cua `wrangler.toml`.

> Dang nhap: email/password + username qua Better Auth, hoac SSO chung
> `auth.huyab.click` (xem `worker/src/sso.ts`). Google di qua SSO nen app
> **khong** can `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` rieng.

## Migration D1

```bash
pnpm db:migrate:remote   # = wrangler d1 migrations apply DB --remote
```

## Luu tru

- Session/user cua Better Auth: bang trong D1, xem `worker/src/adapters/d1/schema.ts`.
- Anh hoa don: R2 chua dung, hien luu inline trong D1.
