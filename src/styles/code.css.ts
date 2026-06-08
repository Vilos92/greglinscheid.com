import {globalStyle} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {fonts, palette} from './tokens';

/*
 * Styles.
 */

// Shiki `.astro-code` layout + theming. `defaultColor: false` in `astro.config.mjs` emits
// `--shiki-*` vars only. We theme in CSS (not Shiki inline `light-dark()` — that stayed on
// the light branch in dark mode here). `@media (prefers-color-scheme: dark)` uses dark vars.

globalStyle('pre.astro-code', {
  fontFamily: fonts.mono,
  fontSize: '0.82em',
  lineHeight: 1.55,
  borderRadius: '10px',
  padding: '1.1em 1.25em',
  overflowX: 'auto',
  maxWidth: '100%',
  margin: '1.5em 0',
  border: `1px solid ${palette.border}`,
  color: 'light-dark(var(--shiki-light), var(--shiki-dark))',
  backgroundColor: 'light-dark(var(--shiki-light-bg), var(--shiki-dark-bg))',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark,
      color: 'var(--shiki-dark)',
      backgroundColor: 'var(--shiki-dark-bg)'
    },
    [media.highContrast]: {
      borderWidth: '2px'
    }
  }
});

globalStyle('pre.astro-code span', {
  color: 'light-dark(var(--shiki-light), var(--shiki-dark))',
  '@media': {
    [media.dark]: {
      color: 'var(--shiki-dark)'
    }
  }
});

globalStyle(':not(pre) > code', {
  fontFamily: fonts.mono,
  fontSize: '0.88em',
  padding: '0.15em 0.4em',
  borderRadius: '4px',
  backgroundColor: palette.codeBg,
  color: palette.codeText,
  '@media': {
    [media.dark]: {
      backgroundColor: palette.codeBgDark,
      color: palette.codeTextDark
    }
  }
});
