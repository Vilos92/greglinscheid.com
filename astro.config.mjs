// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import {vanillaExtractPlugin} from '@vanilla-extract/vite-plugin';
import {defineConfig} from 'astro/config';

/*
 * Constants.
 */

const SITE_URL = 'https://greglinscheid.com';

const SITEMAP_EXCLUDED_PATHS = ['/404/', '/500/'];

/*
 * Config.
 */

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      // CSS vars only — colors live in `code.css.ts` (`light-dark()` + dark-mode var fallback).
      defaultColor: false
    }
  },
  integrations: [
    mdx(),
    sitemap({
      filter: page => !SITEMAP_EXCLUDED_PATHS.some(path => page.includes(path))
    })
  ],
  vite: {
    plugins: [vanillaExtractPlugin()]
  }
});
