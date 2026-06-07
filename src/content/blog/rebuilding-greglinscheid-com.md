---
title: 'Rebuilding greglinscheid.com'
description: 'Same URL, new repo — Astro 6, Vite+, Vanilla Extract, and fallow'
pubDate: 'September 1 2026'
heroImage: '/blog/rebuilding-greglinscheid-com.jpg'
---

<writing from greg>

</writing>

## Where it started

The previous site lived in [astro-greg](https://github.com/Vilos92/astro-greg). First commit **2024-06-28**; [Hello World](/blog/hello-world/) went up the next day.

Stack at the time:

- **Astro 5**
- **Tailwind 3** + `@tailwindcss/typography`
- **React** — one island, [`Breadcrumbs.tsx`](https://github.com/Vilos92/astro-greg/blob/main/src/components/Breadcrumbs.tsx), wrapped by an Astro shell
- **MDX** home page, content collections, Prettier / ESLint / husky

It worked. The site sat fine while life got in the way.

<writing from greg>

</writing>

## Why rebuild now

<writing from greg>

</writing>

The practical trigger: adapt the personal site to the same habits I use elsewhere — **[Vite+](https://viteplus.dev/guide/)**, **Bun**, **Oxlint/Oxfmt** via `vp`, and tooling that plays well with agent-assisted development.

## What changed

| Before (astro-greg)          | Now (greglinscheid.com)                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro 5                      | Astro 6                                                                                                                                                                           |
| Tailwind + typography plugin | [Vanilla Extract](https://vanilla-extract.style/) (`*.css.ts`) — see [`tokens.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/styles/tokens.ts) if you're curious |
| React breadcrumbs island     | Pure Astro — below                                                                                                                                                                |
| Prettier / ESLint / husky    | Vite+ (`vp check`)                                                                                                                                                                |
| —                            | [fallow](https://github.com/fallow-rs/fallow) — below                                                                                                                             |

Styling is Vanilla Extract instead of Tailwind. Not the point of this post; the old site leaned on `prose` classes, the new one uses typed CSS modules and a small token file. That's the whole CSS paragraph unless you want more.

## Breadcrumbs without React

astro-greg shipped a React island for nav crumbs — fine for a quick build, but it pulled in `@astrojs/react` for one component.

This repo drops React entirely. Breadcrumbs are a plain [`Breadcrumbs.astro`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/components/Breadcrumbs.astro) component:

- Reads `Astro.url.pathname`, splits on `/`, builds segments
- Renders an `<nav>` + `<ol>` with `aria-label="Breadcrumb"`
- Title-cases slug segments (`copyparty-tunnel` → "Copyparty Tunnel")
- Styles live in [`breadcrumbs.css.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/styles/breadcrumbs.css.ts)

[`BaseLayout.astro`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/components/BaseLayout.astro) includes it by default (`hasBreadcrumbs` prop to opt out). No client JS, no island hydration.

## Fallow — guardrails for agent-written code

[fallow](https://github.com/fallow-rs/fallow) is not ESLint. It complements lint: dead exports, duplicate code, complexity/health, dependency hygiene. Useful when a lot of code is written or refactored with agents — it flags things that look wrong _before_ they become permanent debt.

I've been running it on [gdex](https://github.com/Vilos92/gdex). The pattern that stuck:

1. **Adopt with empty baselines** — [`078eab4`](https://github.com/Vilos92/gdex/commit/078eab49d4b3a39ee601388cf20fab19e55ae803) committed intentionally empty `.fallow/dupes-baseline.json` and `.fallow/health-baseline.json`. `fallow audit` gates **new** findings on changed files without blocking the whole repo on day-one inherited debt.

2. **When audit fires on your diff, you choose** — fix it, or (with deliberate human review) add to a baseline. Not automatic greenwash.

Examples from gdex where fallow flagged something real:

- **[`7abf7ab`](https://github.com/Vilos92/gdex/commit/7abf7ab8cbeb5ebc7ceafdb4f10987dc773e1b5a)** — keyboard-nav work touched `TaskList` tests; audit found duplicate fixture data across `taskListNavigation.test.ts` and `taskLevel.test.ts`. **Fix:** extract shared [`sampleTasks.fixture.ts`](https://github.com/Vilos92/gdex/blob/main/src/lib/sampleTasks.fixture.ts). Baseline stayed empty; the duplication was worth removing.

- **[`1d4dae6`](https://github.com/Vilos92/gdex/commit/1d4dae6f89f2a6260d51b8af86db5b951a49b978)** — health/complexity on `TaskBreadcrumb`; inline `.map()` logic was doing too much. **Fix:** extract `toBreadcrumbSegment` helper. Again, fix over baseline expansion.

Baselines are a deliberate tradeoff (see [`AGENTS.md`](https://github.com/Vilos92/greglinscheid.com/blob/main/AGENTS.md) — ask before saving), not a way to ignore warnings forever. When fallow complains on a PR, the right question is: _is this real debt, or noise we consciously grandfather?_

This repo wires fallow through [`src/site.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/site.ts) (entry surface) and [`.fallowrc.jsonc`](https://github.com/Vilos92/greglinscheid.com/blob/main/.fallowrc.jsonc). Fresh empty baselines — same adoption pattern as gdex day one.

## Quality gate

| Tool               | Command                | What it does                      |
| ------------------ | ---------------------- | --------------------------------- |
| Vite+ / `vp`       | `vp check`             | Oxfmt + Oxlint + typecheck bundle |
| Oxfmt              | `bun run fmt:check`    | Format                            |
| Oxlint             | `bun run lint`         | Lint                              |
| TypeScript         | `bun run typecheck`    | `tsc --noEmit`                    |
| Vitest (via Vite+) | `bun run test`         | Unit tests                        |
| Fallow             | `bun run fallow:audit` | Audit changed files vs baselines  |
| Astro              | `bun run build`        | Static site build                 |

CI ([`.github/workflows/continuous-integration.yaml`](https://github.com/Vilos92/greglinscheid.com/blob/main/.github/workflows/continuous-integration.yaml)) runs fmt, lint, typecheck, test, and fallow — fallow checkout uses `fetch-depth: 0` so audit can find a merge base.

## What's next

<writing from greg>

</writing>
