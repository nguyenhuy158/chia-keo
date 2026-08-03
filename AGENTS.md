# Repository Guidelines

## Project Structure & Module Organization

This is a React + Vite + TypeScript frontend plus a Hono Cloudflare Worker
backend, both structured as hexagons (ports & adapters) around a shared pure
domain kernel in `shared/` (split math, zod schemas, AI normalization, DTOs).

Frontend: entry point `src/main.tsx` is the composition root that plugs
adapters into ports via `src/core/container.ts`. Pure FE-only rules live in
`src/core/domain/`, port interfaces in `src/core/ports/` (GameApiPort,
QrProviderPort). Implementations live in `src/adapters/browser/` (fetch API,
VietQR, Better Auth client, theme) and `src/adapters/react-query/` (React
Query hooks over GameApiPort). UI lives in `src/components/` and
`src/routes/`. Global styles live in `src/styles.css`; the HTML shell is
`index.html`.

Worker: port interfaces in `worker/src/core/ports/` (GameRepository,
AiProvider), use cases and policies in `worker/src/core/application/`,
implementations in `worker/src/adapters/d1/` (drizzle schema + repository)
and `worker/src/adapters/gemini/`. Hono routes in `worker/src/routes/` are
thin driving adapters. See `docs/architecture.md` for dependency rules.

## Build, Test, and Development Commands

- `pnpm install`: install project dependencies.
- `pnpm dev`: start the Vite development server on `127.0.0.1`.
- `pnpm build`: run TypeScript project build checks, then create the Vite
  production build.
- `pnpm test`: run the Vitest suite.
- `pnpm preview`: preview the production build locally on `127.0.0.1`.

Use `pnpm` for all package commands.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Prefer named exports for utilities
and type imports with `import type`. Follow the existing style: two-space
indentation, double quotes, trailing commas where already used, and concise
function names such as `calculateBalances` or `formatMoney`. React components
should use PascalCase file and component names, for example `App.tsx`. Do not
leave magic strings or magic numbers in code; extract them into clearly named
constants near the relevant module or in a shared constants file when reused.
Split complex logic into small, named functions with one clear responsibility.

Hexagonal boundaries:

- Put pure rules, calculations, parsing, and schema validation shared by FE
  and worker in `shared/`; FE-only pure rules in `src/core/domain/`.
- Put backend business logic in `worker/src/core/application/`; data access
  goes through the `GameRepository` port, never inline SQL in routes.
- Put browser/service implementations in `src/adapters/*`; put DB/AI
  implementations in `worker/src/adapters/*`.
- Keep `fetch`, `window`, `document`, drizzle, VietQR, and UI libraries out
  of every `core/` and out of `shared/`.
- New swappable dependencies get a port in `core/ports/` plus an adapter,
  wired at the composition root (`src/main.tsx` or
  `worker/src/lib/require-user.ts`).

## Testing Guidelines

Tests use Vitest. Prefer colocated test files beside the related module, for
example `shared/split.test.ts` for shared domain math,
`src/core/domain/money.test.ts` for FE domain rules, or
`src/adapters/browser/vietqr.test.ts` for adapter logic. Prioritize coverage
for settlement math, split policies, and QR payload generation.

## Commit & Pull Request Guidelines

This checkout does not include Git history, so no existing commit convention can
be verified. Use concise Conventional Commits, for example `feat: add expense
settlement view` or `fix: handle empty participant split`. Pull requests should
include a short summary, test/build results, linked issue if available, and
screenshots for visible UI changes.

## Agent-Specific Instructions

Keep responses short and focused. If a requirement is unclear, ask before making
assumptions.
Design UI/UX to fit inside a single viewport by default. Avoid page-level
scrolling; use compact layouts, tabs, panes, or contained internal lists when
content can overflow.
