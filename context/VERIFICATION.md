# Verification Loop

How we confirm that code written for SalonPro actually compiles, lints, builds,
and behaves — before it's considered "done". This is the feedback loop the agent
(and you) run after every change: the thing that turns "I wrote it" into "it
works".

> **No real-browser automation.** Per project convention we don't run
> Playwright/headless-Chromium e2e — runtime UI is confirmed by you in your own
> browser, backed by the manual [`QA-CHECKLIST.md`](./QA-CHECKLIST.md). What we
> *do* automate is **jsdom component tests** (Vitest + React Testing Library):
> they render components in Node, not a browser, and assert real behaviour
> (clicks call the right action/endpoint, errors surface, etc.).

## The one command

```bash
npm run verify
```

Runs fail-fast (`&&`), cheapest gate first:

| # | Step              | Command                          | Catches                                               |
|---|-------------------|----------------------------------|-------------------------------------------------------|
| 1 | Prisma client     | `prisma generate`                | stale/missing generated types after schema changes    |
| 2 | Typecheck         | `tsc --noEmit`                   | type errors, broken imports, bad prop/arg shapes       |
| 3 | Lint              | `eslint .`                        | hook rules, lint violations                            |
| 4 | Component tests   | `vitest run`                      | dead/decorative UI, wrong payloads, missing error UX   |
| 5 | Production build  | `next build` → `.next-verify`     | server/client boundary errors, RSC issues, build fail  |

Fast → slow, so you get the cheapest failure first. Typecheck and lint run
standalone (faster than waiting for the full build to surface the same errors).

### Sub-commands (run a single gate)

```bash
npm run typecheck     # just tsc --noEmit  (fastest signal)
npm run lint          # just eslint .
npm run test          # just vitest run
npm run test:watch    # vitest in watch mode while developing
npm run verify:build  # just the production build, into .next-verify
```

## Why the build goes into `.next-verify`

The dev server (`npm run dev`) owns `.next`. A normal `next build` while dev is
running corrupts that shared directory. So `verify:build` sets
`NEXT_DIST_DIR=.next-verify` (wired in `next.config.js` via
`distDir: process.env.NEXT_DIST_DIR || ".next"`), giving the verify build its
own output dir.

**Result: `npm run verify` is safe to run even while the dev server is up.**
`.next-verify/` is gitignored and eslint-ignored (it's minified build output —
don't lint it).

`verify` starts with `rm -rf .next-verify/types`. Next auto-injects
`.next-verify/types/**/*.ts` into `tsconfig.json` (it does this for any non-default
`distDir`), which would make the standalone typecheck choke on *stale* generated
route types after you add/remove an API route. Clearing them first keeps the
pre-build typecheck source-only; the build then regenerates and validates them.

## Writing a component test

Co-locate tests next to the component as `Name.test.tsx`. The pattern
(see `src/components/operator/BillingActions.test.tsx` for a worked example):

- **Mock the data boundary, not the UI.** `vi.mock(...)` the server action or
  stub `fetch` — we assert the component *calls it with the right payload*, not
  the DB. (DB-level checks are the deferred integration layer.)
- **Drive it like a user.** `@testing-library/user-event` to click/type;
  query by role/label (`getByRole`, `getByLabelText`) — accessible queries also
  prove the markup is wired correctly.
- **Assert behaviour, not decoration.** e.g. clicking "Record payment" calls
  `recordBillingPayment("s1", {...})`; a server error renders the message and
  keeps the dialog open.
- Radix UI (Dialog/Select) needs a few browser APIs jsdom lacks — those are
  polyfilled once in `vitest.setup.ts` (ResizeObserver, matchMedia, pointer
  capture, scrollIntoView). `next/navigation` and `sonner` are mocked there too.

## When to run it

- After finishing a change, before calling it done.
- Before committing (recommended — keeps broken code out of history).
- Whenever the agent hands code back for review.

## Reading a failure

- **Typecheck** → fix the types. Most common real-bug signal in strict-mode TS.
- **Lint** → usually mechanical; `eslint . --fix` for autofixable ones.
- **Component test** → either a real regression, or the test/markup drifted
  (e.g. a label changed). Run one file: `npx vitest run path/to/file.test.tsx`.
- **Build passes typecheck but fails** → almost always a server/client boundary
  problem (server-only import in a Client Component, missing `use client`, etc.).

## Roadmap

Active today: static gates **+ jsdom component tests**. Coverage is being built
out per role (operator/billing → owner-admin CRUD → booking/auth). Optional
deeper layers slot into the same `npm run verify` without changing the entry
point:

- **Unit tests** for pure logic (`formatMoney`/`formatRWF`, auth/operator
  guards, `operator-mask`, zod schemas) — same Vitest runner, no jsdom needed.
- **Server integration tests** — hit real API route handlers against a
  throwaway test Postgres; exercise multi-tenant `salonId` scoping and operator
  billing flows. Server-side, still no browser. Not built yet.
