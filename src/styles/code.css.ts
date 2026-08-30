import {globalStyle} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {fonts, palette} from './tokens';

/*
 * Styles.
 */

// Shiki emits light and dark variables with `defaultColor: false`; `light-dark()`
// resolves them through the theme's `color-scheme`.

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
    [media.highContrast]: {
      borderWidth: '2px'
    }
  }
});

globalStyle('pre.astro-code span', {
  color: 'light-dark(var(--shiki-light), var(--shiki-dark))'
});

globalStyle(':not(pre) > code', {
  fontFamily: fonts.mono,
  fontSize: '0.88em',
  padding: '0.15em 0.4em',
  borderRadius: '4px',
  backgroundColor: palette.codeBg,
  color: palette.codeText
});
