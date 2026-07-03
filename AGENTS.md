# Repository Guidelines

## Project Structure & Module Organization

This is a small React + Vite + TypeScript application. The app entry point is
`src/main.tsx`, which renders `src/App.tsx`. Shared domain types live in
`src/types.ts`. Reusable logic is grouped under `src/lib/`, including money
formatting, expense splitting, local storage, and VietQR helpers. Global styles
and Tailwind CSS import live in `src/styles.css`. The static HTML shell is
`index.html`. There is no dedicated test or asset directory yet.

## Build, Test, and Development Commands

- `pnpm install`: install project dependencies.
- `pnpm dev`: start the Vite development server on `127.0.0.1`.
- `pnpm build`: run TypeScript project build checks, then create the Vite
  production build.
- `pnpm preview`: preview the production build locally on `127.0.0.1`.

No test script is currently defined in `package.json`; add one before relying on
automated tests in CI or PR checks. Use `pnpm` for all package commands.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Keep source files in `src/` and
shared pure functions in `src/lib/`. Prefer named exports for utilities and type
imports with `import type`. Follow the existing style: two-space indentation,
double quotes, trailing commas where already used, and concise function names
such as `calculateBalances` or `formatMoney`. React components should use
PascalCase file and component names, for example `App.tsx`. Do not leave magic
strings or magic numbers in code; extract them into clearly named constants near
the relevant module or in a shared constants file when reused. Split complex
logic into small, named functions with one clear responsibility, especially for
calculation, parsing, storage, and UI event-handling code.

## Testing Guidelines

Tests are not configured yet. When adding them, prefer colocated test files such
as `src/lib/split.test.ts` for pure logic and component tests beside the related
component. Prioritize coverage for settlement math, storage behavior, and QR
payload generation. Add a package script such as `pnpm test` and document any new
framework setup here.

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
