---
title: 'Building vilos92.com'
description: 'A tiny project hub on Preact, Vite+, and Cloudflare Workers — static public repo list, fuzzy search, short URLs'
pubDate: 'June 7 2026'
---

<writing from greg>

<!-- Why you wanted vilos92.com — personal motivation, how you use it day to day, one or two sentences on what problem it solves for you. -->

</writing from greg>

## What it is

[vilos92.com](https://vilos92.com) is a project hub: one search box on `/`, and short paths like `vilos92.com/gdex` that redirect to the matching GitHub repo. Miss a slug and you land back on the hub with the query pre-filled so you can pick from fuzzy matches.

The whole app is deliberately small — a prerendered Preact page, a Hono worker for redirects and resolve, and a checked-in JSON file for the repo catalog. Source: [Vilos92/vilos92.com](https://github.com/Vilos92/vilos92.com).

## Where the repo list comes from

The site does not call the GitHub API on every page load. Repo metadata lives in `src/projects.json`, regenerated locally with `bun run sync:projects`:

```bash
gh repo list Vilos92 --limit 1000 --json name,isPrivate,isFork --jq '
  [.[] | select(.isFork == false)]
  | map({
      slug: (.name | ascii_downcase),
      name: .name,
      githubUrl: "https://github.com/Vilos92/\(.name)",
      private: .isPrivate
    })
  | sort_by(.slug)
'
```

The shell script wraps that (`scripts/sync-projects-json.sh`): requires `gh` + `jq`, skips the write when nothing changed, and exits with code 10 when `gh` is missing or unauthenticated so agents can fall back to other tooling.

At build time, Zod validates the JSON and the app splits public from private:

```typescript
const projectSchema = z.object({
  slug: z.string(),
  name: z.string(),
  githubUrl: z.url(),
  private: z.boolean()
});

export const projects = projectsSchema.parse(projectsJson);
export const publicProjects = projects.filter(project => !project.private);
```

**Public repos** feed the client-side search combobox — names and slugs ship in the static bundle, so typing never hits the network. **Private repos** stay out of that list; the worker still knows about them for slug resolution when you explicitly submit a query (see below). Re-run `sync:projects` when you add or rename repos, commit the diff, deploy.

<writing from greg>

<!-- Anything personal about curating the list, how often you sync, forks you exclude, etc. -->

</writing from greg>

## Stack

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| UI         | Preact 10 + Vanilla Extract (`*.css.ts`)                                |
| Toolchain  | [Vite+](https://viteplus.dev/guide/) (`vp dev`, `vp check`, `vp build`) |
| Worker     | [Hono](https://hono.dev/) on Cloudflare Workers                         |
| Deploy     | `wrangler deploy` — `src/worker.ts` is the entry                        |
| Search     | [fuzzysort](https://github.com/farzher/fuzzysort) over public slugs     |
| Validation | Zod for `projects.json`; Vitest + fallow in CI                          |

Wrangler config is minimal — worker name, compatibility date, main module:

```jsonc
{
  "name": "vilos92-com",
  "compatibility_date": "2025-04-17",
  "main": "src/worker.ts"
}
```

The Vite config uses `@cloudflare/vite-plugin`, `@preact/preset-vite` with **prerender enabled**, and Vanilla Extract. One HTML shell, one client entry:

```html
<div id="root"></div>
<script type="module" src="/src/hub-app.tsx" prerender></script>
```

Build-time prerender renders `HubApp` to HTML; the client hydrates on load:

```typescript
export async function prerender() {
  return {html: renderToString(<HubApp />)};
}

// client
hydrate(<HubApp />, root);
```

## Snappy by design

Despite the feature set (combobox, keyboard nav, URL sync, slug redirects), the shipped assets stay tiny. A recent production build:

| Asset                   | Size    |
| ----------------------- | ------- |
| `hub-app-*.js`          | ~103 KB |
| `hub-app-*.css`         | ~5 KB   |
| `rolldown-runtime-*.js` | ~0.5 KB |

Why it stays fast:

1. **Prerendered shell** — first paint is HTML, not a blank `#root`.
2. **No search API** — `publicProjects` is in the bundle; `fuzzysort` runs locally as you type:

```typescript
export function searchPublicProjects(projects: readonly Project[], query: string, limit = 8) {
  return searchPublicProjectsScored(projects, query, limit).map(result => result.obj);
}
```

3. **Worker only on submit** — choosing or submitting a slug calls `/api/resolve?q=…`; the worker returns `{ok, slug, name, url}` or `{ok: false}`. Success opens GitHub in a new tab.
4. **302 redirects for bookmarkable paths** — `GET /:slug` never serves a page; it redirects to GitHub or back to `/?q=slug`:

```typescript
export function resolveSlugPath(pathname: string): RedirectResult {
  const slug = pathname.replace(/\/+$/, '').slice(1);
  const exact = exactProjectBySlug(projects, slug);
  if (exact) {
    return {kind: 'redirect', location: exact.githubUrl};
  }
  const fuzzy = fuzzyFindPublicProject(projects, slug.toLowerCase());
  if (fuzzy) {
    return {kind: 'redirect', location: fuzzy.githubUrl};
  }
  return {kind: 'redirect', location: hubSearchUrl(slug)};
}
```

Fuzzy matching uses a score threshold and a gap between first- and second-place matches so ambiguous slugs (e.g. two repos that both match `ck`) fall through to hub search instead of a wrong redirect.

<writing from greg>

<!-- Your take on performance tradeoffs, whether the bundle size matters to you, "feels instant" anecdotes, etc. -->

</writing from greg>

## Quality gate

Same playbook as [this site's rebuild](/blog/the-new-new-greglinscheid-com/): `vp check`, Vitest, fallow audit in CI. Hub search and routing logic are heavily unit-tested (`routing.test.ts`, `hub-search*.test.ts`, `slug-fuzzy.test.ts`) because the redirect and combobox behavior is easy to regress.

## Links

- Live: [vilos92.com](https://vilos92.com)
- Repo: [github.com/Vilos92/vilos92.com](https://github.com/Vilos92/vilos92.com)
- Sync script: `bun run sync:projects`

<writing from greg>

<!-- Closing — what's next for the hub, or a wink that this post isn't about blog posts. -->

</writing from greg>
