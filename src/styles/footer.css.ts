import {globalStyle, style} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {tapExtension} from './interaction';
import {palette} from './tokens';

/*
 * Styles.
 */

export const footer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '3rem 1em 2.5rem',
  color: palette.textMuted,
  fontSize: '0.9em',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});

export const footerCopy = style({
  margin: 0
});

export const footerNav = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem'
});

// The tap extension keeps the ~50px hit box without inflating the text layout
// on touch devices; the 0.25rem sides stay within the nav's 0.5rem gaps.
export const footerLink = style([
  {
    textDecoration: 'none',
    color: 'inherit',
    '@media': {
      [media.highContrast]: {
        textDecoration: 'underline',
        textDecorationThickness: '2px'
      }
    }
  },
  tapExtension('0.5rem', '0.25rem')
]);

globalStyle(`${footerLink}:hover`, {
  '@media': {
    [media.hover]: {
      color: palette.link,
      textDecoration: 'underline'
    },
    [`${media.hover} and ${media.dark}`]: {
      color: palette.linkDark
    }
  }
});

export const footerSep = style({
  color: palette.textMuted,
  userSelect: 'none',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});
