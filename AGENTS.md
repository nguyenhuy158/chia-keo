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

Folder structure:

```text
shared/                        # Pure domain kernel shared by FE + worker (no IO)
  split.ts                     #   Split math, balances, settlements, computeSplitRows
  schemas.ts                   #   Zod input schemas + domain constants
  ai.ts                        #   AI suggestion normalization/resolution (pure)
  api-types.ts                 #   DTOs exchanged between FE and worker
  rate-limit.ts                #   Pure rate-limit logic

src/                           # Frontend hexagon
  core/
    domain/money.ts            #   VND format/parse (FE-only pure rules)
    ports/game-api.ts          #   Backend API port
    ports/qr-provider.ts       #   Payment QR port
    container.ts               #   Minimal DI: provide*/get* per port
  adapters/
    browser/http-game-api.ts   #   fetch adapter for GameApiPort
    browser/vietqr.ts          #   VietQR adapter for QrProviderPort
    browser/auth-client.ts     #   Better Auth client
    browser/theme.ts           #   localStorage + matchMedia theme persistence
    react-query/queries.ts     #   React Query hooks over GameApiPort
  components/  routes/         #   Presentation (React)
  main.tsx                     #   Composition root: plugs adapters into ports

worker/src/                    # Backend hexagon (Hono on Cloudflare Worker)
  core/
    ports/game-repository.ts   #   Storage port (row types + interface)
    ports/ai-provider.ts       #   AI JSON-generation port
    application/               #   Use cases + policies (ownership, realloc, ...)
  adapters/
    d1/schema.ts               #   Drizzle schema (drizzle-kit source)
    d1/game-repository.ts      #   D1/drizzle adapter for GameRepository
    gemini/gemini.ts           #   Gemini adapter for AiProvider
  routes/                      #   Thin HTTP adapters: parse -> use case -> JSON
  lib/                         #   Small infra: http helpers, ids, require-user
  auth.ts  env.ts  index.ts    #   Better Auth, Env type, app + middleware

functions/api/[[path]].ts      # Cloudflare Pages shim delegating /api/* to the worker
drizzle/                       # Generated D1 migrations
e2e/ui-smoke.mjs               # Playwright smoke suite (pnpm e2e)
```

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
