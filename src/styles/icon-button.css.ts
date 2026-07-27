import {style} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {hover} from './interaction';
import {palette} from './tokens';

/*
 * Styles.
 */

/**
 * The shared square icon-button look (the studio's copy button, the /milo
 * close button): quiet surface chrome that warms to the accent on hover.
 * Consumers compose via `style([iconButton, {...}])` and keep their own
 * sizing, including the coarse-pointer 44px square, so their size rules
 * always win the cascade over this base.
 */
export const iconButton = style([
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    color: palette.textMuted,
    backgroundColor: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    '@media': {
      [media.dark]: {
        color: palette.textMutedDark,
        backgroundColor: palette.surfaceDark,
        borderColor: palette.borderDark
      },
      [media.highContrast]: {
        borderWidth: '2px'
      }
    },
    selectors: {
      '&:focus-visible': {
        outline: `2px solid ${palette.accent}`,
        outlineOffset: '2px'
      }
    }
  },
  hover({color: palette.accent, borderColor: palette.accent})
]);
