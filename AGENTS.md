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
- **Exports:** module-private until another file imports (or we ship a stable public API).
- **`?` vs `| undefined`:** optional props (`prop?:`) for wide/omitted keys; internal call sites use required `prop: T | undefined`. **Exception:** DOM-style props (`class?`, etc.) stay optional—omit at call sites when unused.
- **Readonly arrays** for read-only / pass-through data (`readonly T[]` or named aliases).

## Astro

- **`src/pages/`** — file-based routes; **`src/layouts/`** — shared page shells; **`src/components/`** — reusable partials.
- **`astro.config.mjs`** and **`src/env.d.ts`** are tooling/types, not ship surfaces for Fallow (see below).
- Shared site metadata and TS modules live under **`src/`** (e.g. **`src/site.ts`**).

## File layout (section comments)

**TypeScript** (`src/**/*.ts`, `*.tsx`): section markers are **multi-line block comments** (sentence-case label + period). Blank line before and after each block:

```
/*
 * Types.
 */
```

Do **not** collapse these to single-line `/* Types. */`.

Top-down: entry first, **Helpers.** last.

**Order** (omit unused; no empty **Types.** / **Helpers.**):

1. **Types.** · **Constants.**
2. **Schemas.** (or inline single-schema in one file)
3. Entry: **Script.** | **Component.** | **Styles.** | **Config.**
4. **Hooks.**
5. **Helpers.**

**Config** (`vite.config.ts`, `astro.config.mjs`): **Constants.** → **Config.** (default export). Module-level `const` above the entry; only `function` helpers may follow (hoisting).

**Lean files** (one export, few lines): one matching entry block is enough.

**Tests:** colocate **`{module}.test.ts`**; **Constants.** (fixtures) → **Tests.** when the file uses section blocks.

## Code style

- Functional style; early returns; small helpers over deep nesting.
- Prefer **`map` / `filter` / `reduce`**; no **`forEach`**—use **`for`…`of`** (or indexed `for`) when imperative.

## Comments

- **Why** over **what**. Short **JSDoc** when the contract is non-obvious.
- In prose, backtick **identifiers** (`siteUrl`), not section headers.
- **Section blocks** (see **File layout**) label structure only — no extra explanation inside the marker.

## Naming

- **Booleans:** predicate prefixes (`is`, `has`, `did`, `should`, `can`, …) for locals, props, and fields — not bare adjectives or state nouns (`open` → `isOpen`, `loading` → `isLoading`).
- **Boolean helpers** (non–type-guard functions): **`check`** prefix — e.g. `checkIsDraft`, not `isDraft`. Reserve **`is` / `has` / …** on functions for type guards only.
- **Locals:** readable names (`pageTitle`), not `e` / `x` unless scope is tiny.

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
