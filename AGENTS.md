# Repository Guidelines

## Project Structure & Module Organization

This is a React + Vite + TypeScript application using a lightweight hexagonal
architecture. The app entry point is `src/main.tsx`, which renders
`src/App.tsx`. Domain types and pure business rules live under
`src/core/domain/`. Application use cases live under `src/core/application/`.
Ports live under `src/core/ports/`. Browser-dependent implementations such as
`localStorage`, fetch API calls, DiceBear avatar generation, and VietQR helpers
live under `src/adapters/browser/`. The `src/lib/` folder is a compatibility
re-export layer for older imports; do not add new source logic there. Global
styles and Tailwind CSS import live in `src/styles.css`. The static HTML shell
is `index.html`.

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

- Put pure rules, calculations, parsing, and schema validation in
  `src/core/domain/`.
- Put use cases that coordinate domain rules in `src/core/application/`.
- Put browser/service implementations in `src/adapters/browser/`.
- Keep `fetch`, `localStorage`, `window`, `document`, DiceBear, VietQR, and UI
  libraries out of `src/core/`.
- Keep `src/lib/` as re-export compatibility only.

## Testing Guidelines

Tests use Vitest. Prefer colocated test files beside the related module, for
example `src/core/domain/split.test.ts` for pure logic or component tests beside
the related component. Existing `src/lib/*.test.ts` files may stay while `src/lib`
is kept as a compatibility layer. Prioritize coverage for settlement math,
storage behavior, share snapshots, and QR payload generation.

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
