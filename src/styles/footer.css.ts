import {globalStyle, style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';
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

export const footerLink = style({
  textDecoration: 'none',
  color: 'inherit',
  '@media': {
    [media.coarsePointer]: {
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: touchTargetMin,
      padding: '0.25rem 0.35rem'
    },
    [media.highContrast]: {
      textDecoration: 'underline',
      textDecorationThickness: '2px'
    }
  }
});

globalStyle(`${footerLink}:hover`, {
  color: palette.link,
  textDecoration: 'underline',
  '@media': {
    [media.dark]: {
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
