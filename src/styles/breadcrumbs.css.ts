import {globalStyle, style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';
import {palette} from './tokens';

/*
 * Styles.
 */

export const breadcrumbs = style({
  margin: '0 0 1.5rem',
  padding: '0 0 0.75rem',
  borderBottom: `1px solid ${palette.border}`,
  fontSize: '0.82rem',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  '@media': {
    [media.dark]: {
      borderBottomColor: palette.borderDark
    },
    [media.highContrast]: {
      borderBottomWidth: '2px'
    }
  }
});

export const breadcrumbList = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.4rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  '@media': {
    [media.coarsePointer]: {
      flexWrap: 'nowrap',
      overflowX: 'auto'
    }
  }
});

export const breadcrumbItem = style({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: '0.4rem',
  whiteSpace: 'nowrap',
  '@media': {
    [media.coarsePointer]: {
      minHeight: touchTargetMin,
      padding: '0.25rem 0'
    }
  }
});

globalStyle(`${breadcrumbItem}:not(:first-child)::before`, {
  content: "'/'",
  lineHeight: 1,
  color: palette.textMuted,
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});

export const breadcrumbLink = style({
  lineHeight: 1,
  textDecoration: 'none',
  color: palette.link,
  '@media': {
    [media.dark]: {
      color: palette.linkDark
    }
  }
});

globalStyle(`${breadcrumbLink}:hover`, {
  textDecoration: 'underline',
  color: palette.linkHover,
  '@media': {
    [media.dark]: {
      color: palette.linkHoverDark
    }
  }
});

export const breadcrumbCurrent = style({
  lineHeight: 1,
  color: palette.text,
  fontWeight: 600,
  '@media': {
    [media.dark]: {
      color: palette.textDark
    }
  }
});
