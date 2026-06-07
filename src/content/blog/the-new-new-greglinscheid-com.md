---
title: 'The new new greglinscheid.com'
description: 'Same URL, new repo — Astro 6, Vite+, Vanilla Extract, and fallow'
pubDate: 'June 7 2026'
heroImage: '/blog/the-new-new-greglinscheid-com.jpg'
---

## Welcome to the new new greglinscheid.com

Hi there. I don't write a lot of blog posts. My last one was [copyparty + Cloudflare Tunnel](/blog/copyparty-tunnel/). This is about a copyparty + Cloudflare Docker image that has since been replaced by my [homelab setup](https://github.com/Vilos92/greg-zone).

[Hello World](/blog/hello-world/) was the first post on that site. The stack I had been using up until today:

- **Astro 5**
- **Tailwind 3** + `@tailwindcss/typography`
- **Breadcrumbs** — a React island ([`Breadcrumbs.tsx`](https://github.com/Vilos92/astro-greg/blob/main/src/components/Breadcrumbs.tsx)) for nav
- **MDX** home page, content collections, Prettier / ESLint / husky

Things worked pretty well. They still work too, but things have changed quickly in a few years, including how quickly I can make things change.

## Why rebuild now

The biggest reason is curiosity. The more practical reason is to have this site aligned with the tech stack I'm using on my more recent projects: **[Vite+](https://viteplus.dev/guide/)**, **Bun**, **`vp`** for Oxlint and Oxfmt, Cloudflare for deployments, that sort of thing.

## What changed

| Before (astro-greg)          | Now (greglinscheid.com)                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro 5                      | Astro 6                                                                                                                                                                           |
| Tailwind + typography plugin | [Vanilla Extract](https://vanilla-extract.style/) (`*.css.ts`) — see [`tokens.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/styles/tokens.ts) if you're curious |
| React breadcrumbs island     | Pure Astro (see below)                                                                                                                                                            |
| Prettier / ESLint / husky    | Vite+ (`vp check`)                                                                                                                                                                |
| —                            | [fallow](https://github.com/fallow-rs/fallow) (see below)                                                                                                                         |

Styling is Vanilla Extract instead of Tailwind. The old site leaned on `prose` classes, the new one uses typed CSS modules and a small token file.

## Breadcrumbs without React

[astro-greg](https://github.com/Vilos92/astro-greg) shipped a React island for nav crumbs. Fine for a quick build, but it pulled in `@astrojs/react` for one component.

This repo drops React entirely (for now). Breadcrumbs are a plain [`Breadcrumbs.astro`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/components/Breadcrumbs.astro) component:

- Reads `Astro.url.pathname` and splits on `/`, builds segments
- Renders an `<nav>` + `<ol>` with `aria-label="Breadcrumb"`
- Title-cases slug segments (`copyparty-tunnel` → "Copyparty Tunnel")
- Styles live in [`breadcrumbs.css.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/styles/breadcrumbs.css.ts)

[`BaseLayout.astro`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/components/BaseLayout.astro) includes it by default (`hasBreadcrumbs` prop to opt out).

## Fallow — guardrails for agent-written code

[fallow](https://github.com/fallow-rs/fallow) complements traditional linters and catches: dead exports, duplicate code, complexity/health, dependency hygiene. Handy when agents write or refactor a lot of code, as it flags things that look wrong _before_ they become permanent debt.

I've been running it on [gdex](https://github.com/Vilos92/gdex) for a while. Same playbook here, in [`AGENTS.md`](https://github.com/Vilos92/greglinscheid.com/blob/main/AGENTS.md): empty baselines so `fallow audit` only flags new issues in files you touched. Fix what you can, extend the fallow entry, or delete dead code — ask a human before adding anything to a baseline, and don't refresh baselines just because audit failed.

[`src/site.ts`](https://github.com/Vilos92/greglinscheid.com/blob/main/src/site.ts) is fallow's entry point here; [`.fallowrc.jsonc`](https://github.com/Vilos92/greglinscheid.com/blob/main/.fallowrc.jsonc) points at it and at empty baselines in `.fallow/`.

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

CI ([`.github/workflows/continuous-integration.yaml`](https://github.com/Vilos92/greglinscheid.com/blob/main/.github/workflows/continuous-integration.yaml)) runs fmt, lint, typecheck, test, and fallow.

## What's next

Maybe I'll finally write another blog post, about something other than writing blog posts. How exciting! Stay tuned.
