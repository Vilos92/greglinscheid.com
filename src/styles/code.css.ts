import {globalStyle} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {fonts, palette} from './tokens';

/*
 * Styles.
 */

// Shiki dual themes: Astro sets --shiki-light/dark vars on .astro-code spans.
// https://docs.astro.build/en/guides/syntax-highlighting/

globalStyle('pre.astro-code', {
  fontFamily: fonts.mono,
  fontSize: '0.82em',
  lineHeight: 1.55,
  borderRadius: '10px',
  padding: '1.1em 1.25em',
  overflowX: 'auto',
  margin: '1.5em 0',
  border: `1px solid ${palette.border}`,
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark
    },
    [media.highContrast]: {
      borderWidth: '2px'
    }
  }
});

globalStyle('pre.astro-code span', {
  color: 'var(--shiki-light)',
  backgroundColor: 'var(--shiki-light-bg)',
  fontStyle: 'var(--shiki-light-font-style)',
  fontWeight: 'var(--shiki-light-font-weight)',
  textDecoration: 'var(--shiki-light-text-decoration)',
  '@media': {
    [media.dark]: {
      color: 'var(--shiki-dark)',
      backgroundColor: 'var(--shiki-dark-bg)',
      fontStyle: 'var(--shiki-dark-font-style)',
      fontWeight: 'var(--shiki-dark-font-weight)',
      textDecoration: 'var(--shiki-dark-text-decoration)'
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
