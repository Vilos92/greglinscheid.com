---
title: 'Building vilos92.com'
description: 'A tiny project hub on Preact, Vite+, and Cloudflare Workers: static public repo list, fuzzy search, short URLs'
pubDate: 'June 8 2026'
heroImage: '/blog/building-vilos92-com.jpg'
---

## Seriously, why did you build this?

As I mentioned in [my last blog post](/blog/the-new-new-greglinscheid-com/), I wanted a reason to write a blog post about something other than blog posts, so here we... ah I did it again.

Anyways, the real motivation: I hate going to GitHub and then finding my projects in their clunky, slow UI. It works, and for many years it wasn't something I considered worth fixing.

But now with LLMs, prototyping and building simple projects is quite cheap.

So, [vilos92.com](https://vilos92.com) is a project hub: one search box on `/`, and short paths like `vilos92.com/gdex` that redirect to the matching GitHub repo. Miss a slug and you land back on the hub with the query pre-filled so you can pick from fuzzy matches.

The whole app is deliberately small. It's a prerendered Preact page, a Hono worker for redirects and resolve, and a checked-in JSON file for the repo catalog. Source: [Vilos92/vilos92.com](https://github.com/Vilos92/vilos92.com).

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

**Public repos** feed the client-side search combobox. Names and slugs ship in the static bundle, so typing never hits the network. **Private repos** stay out of that list. The worker still knows about them for slug resolution when you explicitly submit a query (see below). Re-run `sync:projects` when you add or rename repos, commit the diff, deploy.

## Stack

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| UI         | Preact 10 + Vanilla Extract (`*.css.ts`)                                |
| Toolchain  | [Vite+](https://viteplus.dev/guide/) (`vp dev`, `vp check`, `vp build`) |
| Worker     | [Hono](https://hono.dev/) on Cloudflare Workers                         |
| Deploy     | `wrangler deploy`, entry `src/worker.ts`                                |
| Search     | [fuzzysort](https://github.com/farzher/fuzzysort) over public slugs     |
| Validation | Zod for `projects.json`, Vitest + fallow in CI                          |

Wrangler config is minimal: worker name, compatibility date, main module:

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

Build-time prerender renders `HubApp` to HTML so that the client can hydrate on load:

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

1. **Prerendered shell**: first paint is HTML, not a blank `#root`.
2. **No search API**: `publicProjects` is in the bundle. `fuzzysort` runs locally as you type:

```typescript
export function searchPublicProjects(projects: readonly Project[], query: string, limit = 8) {
  return searchPublicProjectsScored(projects, query, limit).map(result => result.obj);
}
```

3. **Worker only on submit**: choosing or submitting a slug calls `/api/resolve?q=…`. The worker returns `{ok, slug, name, url}` or `{ok: false}`. Success opens GitHub in a new tab.
4. **302 redirects for bookmarkable paths**: `GET /:slug` never serves a page. It redirects to GitHub or back to `/?q=slug`:

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

All in all, this setup does what I need: fast personal links to my repos, fuzzy enough to forgive typos, and shareable short URLs that redirect to GitHub.

## Quality gate

This project follows the same playbook as [this site's rebuild](/blog/the-new-new-greglinscheid-com/): `vp check`, Vitest, fallow audit in CI. Hub search and routing logic are heavily unit-tested (`routing.test.ts`, `hub-search*.test.ts`, `slug-fuzzy.test.ts`) because the redirect and combobox behavior is easy to regress.

Live at [vilos92.com](https://vilos92.com), source at [github.com/Vilos92/vilos92.com](https://github.com/Vilos92/vilos92.com). Repo list sync: `bun run sync:projects`.

## What's next

I'd like to post about [gdex](https://github.com/Vilos92/gdex) sometime, but we'll see if this homepage burst can keep pace.
