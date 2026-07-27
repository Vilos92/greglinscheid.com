<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Agent notes

Living conventions for this repo. Ask whether new habits belong here vs `README.md`.

## Bun

- **Bun-first** for installs and scripts (`bun install`, `bun run …`, `bun x …`). Day-to-day app tooling uses **`vp`** (`vp dev`, `vp check`, `vp test`) per Vite+ above.
- Prefer Bun (or **`vp`**) equivalents when upstream docs use npm/pnpm/npx. Run **`bun install`** after pulling.

## TypeScript

- Prefer **`type` over `interface`** unless you need declaration merging (we do not).
- Prefer **`undefined` over `null`**. Model absence as `undefined`; Zod **`.optional()`**, not **`.nullable().optional()`**. No `?? null` unless a contract requires `null`.
- **`??` vs `||`:** **`??`** for nullish default only; **`||`** for booleans / deliberate truthiness. Empty-string-as-absent → named helper, not `value || fallback`.
- No **`x ?? undefined`** when `x` is already `T | undefined` without `null`.
- **Exports:** module-private until another file imports (or we ship a stable public API). Fallow flags unused exports—wire, **`entry`**, or delete (see **Validation** / **Fallow entry**).
- **`?` vs `| undefined`:** optional props (`prop?:`) for wide/omitted keys; internal call sites use required `prop: T | undefined`. **Exception:** DOM-style props (`class?`, etc.) stay optional—omit at call sites when unused.
- **Readonly arrays** for read-only / pass-through data (`readonly T[]` or named aliases).

## Imports

- Use **`import type`** for type-only imports in `src/**/*.ts` / `*.tsx` frontmatter and shared modules.

## Astro

- **`src/pages/`** — file-based routes; **`src/layouts/`** — shared page shells; **`src/components/`** — reusable partials.
- **`astro.config.mjs`** and **`src/env.d.ts`** are tooling/types, not ship surfaces for Fallow (see below).
- Shared site metadata and TS modules live under **`src/`** (e.g. **`src/site.ts`**).

## Vanilla Extract

- **`*.css.ts`** under **`src/styles/`** (`global.css.ts`, `prose.css.ts`, …); import from layouts and pages that need them.
- **`data-*` attribute variants over class composition.** Encode discrete state with `data-` attributes and match them in `selectors`. Do not toggle separate BEM modifier classes.
- **Runtime-varying values via `createVar` + `setElementVar`.** CSS variables that change at runtime flow through a `createVar()` in `.css.ts` and are updated by `setElementVar` from `@vanilla-extract/dynamic`. The static rule stays in `.css.ts`; only the value moves at runtime.
- **Imperative `element.style` is the last resort.** Reach for it only when neither pattern above fits.
- **Gate hover styling** with `hover()` (composable) or `hoverRule()` (for `globalStyle`) from `src/styles/interaction.ts`, so hover state applies only where the primary input can hover.
- **Grow coarse-pointer tap targets with `tapExtension(vertical, horizontal)`:** padding plus an equal negative margin, zero layout shift. Cap `horizontal` at half any flex `gap` so adjacent targets meet edge to edge; where an overflow container would clip the extension (breadcrumbs), grow the row with `minHeight` instead.

## File layout (section comments)

**TypeScript** (`src/**/*.ts`, `*.tsx`): section markers are **multi-line block comments** (sentence-case label + period). Blank line before and after each block, and between the comment and the code below it:

```
/*
 * Types.
 */

type Foo = …;
```

Do **not** collapse these to single-line `/* Types. */`. Skip section markers on lean single-export files where they add ceremony only.

Top-down: entry first, **Helpers.** last.

**Order** (omit unused; no empty **Types.** / **Helpers.**):

1. **Types.** · **Constants.** · **Scratch.**
2. **Schemas.** (or inline single-schema in one file)
3. Entry: **Script.** | **Component.** | **Styles.** | **Config.** | **Entry.** (exported entry function, e.g. `startMilos`)
4. **Hooks.**
5. **Helpers.**

**Scratch.** holds module-scope state that gets mutated — including a `const` whose properties are mutated (`instanceCount`, `motionPreference`). It sits directly above the entry section.

**Config** (`vite.config.ts`, `astro.config.mjs`): **Constants.** → **Config.** (default export). Module-level `const` above the entry; only `function` helpers may follow (hoisting).

**Lean files** (one export, few lines): one matching entry block is enough.

**Tests:** colocate **`{module}.test.ts`**; **Constants.** (fixtures) → **Tests.** when the file uses section blocks.

## Code style

- Functional style; early returns; small helpers over deep nesting.
- Prefer **`map` / `filter` / `reduce`**; no **`forEach`**—use **`for`…`of`** (or indexed `for`) when imperative.
- **`no-nested-ternary`** and **`curly: all`** are Oxlint errors (via `vp check`)—always brace blocks; no nested ternaries.

## Comments

- **Why** over **what**. Drop comments that only restate mechanics the code already shows.
- **State intent positively.** Explain what we do and why, not what we avoid or what could fail. Prefer `// ensures Y` over `// prevents X` when the code already makes X impossible.
- **Layer once.** Put shared why on a constant, type field, or entry closure. Do not repeat the same rationale at every call site.
- **JSDoc** on exports and non-trivial helpers when the contract is not obvious—often one crisp line is enough. Do not document module-private types (see **Exports**).
- In prose, backtick **identifiers** (`siteUrl`, `pointercancel`, `Header.astro`), not section headers.
- Default to **separate sentences** over semicolons or em dashes joining clauses. Either is fine occasionally for a tight parenthetical, but overuse gives the codebase a heavy editorial voice.
- **Balance line widths** in multi-line comments, and never wrap mid-token (`display: none` stays on one line).
- **`@sideEffect` (house tag):** flag named non-pure functions — mutation, async I/O, non-determinism, DOM writes, listener registration — with a terse clause naming the effect ("Mutates `pid`.", "Marks each adopted svg started."). Pure functions get **no** tag; closures stay untagged in this repo.
- **Section blocks** (see **File layout**) label structure only — no extra explanation inside the marker.

## Naming

- **Booleans:** predicate prefixes (`is`, `has`, `did`, `should`, `can`, …) for locals, props, and fields — not bare adjectives or state nouns (`open` → `isOpen`, `loading` → `isLoading`).
- **Boolean predicates:** name functions that return yes/no so the call reads as a question (`canShowDraft`, `hasProjects`, `checkIsDraft`). Prefer `can` / `has` / `check` / `should` over `getIs…` / `getShould…`—that pattern reads like a property accessor for a stored flag. Reserve **`is` / `has` / …** on functions for type guards only.
- **`compute` / `calc`** for calculated non-boolean results (`computePageTitle`).
- **Locals:** readable names (`pageTitle`), not `e` / `x` unless scope is tiny.
- **Name for what a thing is, not where it lives.** When a folder or module already conveys context, do not restate it as an identifier prefix.

## Fail fast

- Throw with a clear message rather than run in a misleading state.
- Avoid plausible-looking placeholders for values the site cannot function without.

## Fallow entry

Ship surfaces are mostly **`.astro`** pages today. Fallow needs a reachable JS/TS entry: **`src/site.ts`**. When you add shared TS modules (layouts, components, `lib/`), wire them from that entry or extend **`entry`** in **`.fallowrc.jsonc`**.

Oxlint (`vp lint`) does **not** replace Fallow for cross-file unused exports.

## Validation

**When:** large or high-impact diff (`src/`, `astro.config.mjs`, `vite.config.ts`, CI); before commit.

**Loop** (stop on first failure):

1. `vp check` — fmt, lint, typecheck
2. `vp test`
3. `bun run fallow:audit` (CI: `--base` on PRs; see workflow)

**CI job → local command:**

| Job         | Local                  |
| ----------- | ---------------------- |
| `fmt`       | `bun run fmt:check`    |
| `lint`      | `bun run lint`         |
| `typecheck` | `bun run typecheck`    |
| `test`      | `bun run test`         |
| `fallow`    | `bun run fallow:audit` |

**Fallow:** fix, **`entry`** in **`.fallowrc.jsonc`**, or delete—no greenwash. Ask the human before permanent ignores or baselines. **`bun run fallow:audit`** only (not **`fallow-rs/fallow@v2`**). Baselines **`dupes-baseline.json`** / **`health-baseline.json`** are versioned; refresh with **`fallow dupes --save-baseline`** / **`fallow health --save-baseline`** after human review—not by default when audit fails.

## Keeping this file useful

When we lock in a new convention, ask whether it should be added or tightened in `AGENTS.md`.
