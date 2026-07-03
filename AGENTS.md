# Repository Guidelines

## Project Structure & Module Organization

Full-stack app: React + Vite + TypeScript frontend, Hono API on Cloudflare
Workers, Cloudflare D1 via Drizzle ORM.

- `src/main.tsx` renders the router (`src/router.tsx`, TanStack Router,
  code-based routes). Pages live in `src/routes/`, reusable UI in
  `src/components/`, API client / React Query hooks / auth client in
  `src/lib/`.
- `shared/` holds pure logic used by both frontend and worker: `split.ts`
  (settlement math), `schemas.ts` (Zod inputs), `api-types.ts` (API response
  types).
- `worker/src/` is the Hono API: `index.ts` (app + CORS), `auth.ts`
  (Better Auth with username plugin), `db/schema.ts` (Drizzle schema),
  `routes/games.ts` and `routes/share.ts`, helpers in `lib/`.
- `drizzle/` contains generated SQL migrations; `wrangler.jsonc` configures the
  Worker, D1 binding `DB`, and static assets served from `dist/`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies.
- `cp .dev.vars.example .dev.vars`: set `BETTER_AUTH_SECRET` for local dev.
- `pnpm db:migrate:local`: apply migrations to the local D1 database.
- `pnpm dev:api`: run the Worker (wrangler dev) on `127.0.0.1:8787`; requires
  `dist/` to exist (run `pnpm build` once first).
- `pnpm dev`: Vite dev server on `127.0.0.1:5173`, proxies `/api` to 8787.
- `pnpm build`: TypeScript project build checks, then Vite production build.
- `pnpm test`: Vitest (pure logic tests in `shared/` and `src/lib/`).
- `pnpm check`: typecheck all tsconfig projects (app, node, worker).
- `pnpm db:generate`: regenerate migrations after editing
  `worker/src/db/schema.ts`.

Use `pnpm` for all package commands.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Keep shared pure functions in
`shared/`, frontend-only helpers in `src/lib/`. Prefer named exports and
`import type`. Follow the existing style: two-space indentation, double quotes,
trailing commas where already used, concise function names such as
`calculateBalances` or `formatMoney`. React components use PascalCase file and
component names. Do not leave magic strings or numbers; extract clearly named
constants. Split complex logic into small, named functions with one clear
responsibility, especially for calculation, parsing, storage, and UI
event-handling code. Server-side: never trust client-provided split amounts —
recompute from validated inputs (see `worker/src/routes/games.ts`).

## Testing Guidelines

Vitest is configured through `vite.config.ts` (`src/**/*.test.ts`,
`shared/**/*.test.ts`, node environment). Colocate test files next to the code
(`shared/split.test.ts`, `src/lib/money.test.ts`). Prioritize settlement math,
API input validation, and QR payload generation. Run `pnpm test` before
pushing; CI (`.github/workflows/ci.yml`) runs test + build on every PR.

## Commit & Pull Request Guidelines

Use concise Conventional Commits, for example `feat: add expense settlement
view` or `fix: handle empty participant split`. Pull requests should include a
short summary, test/build results, linked issue if available, and screenshots
for visible UI changes.

## Agent-Specific Instructions

Keep responses short and focused. If a requirement is unclear, ask before
making assumptions.
