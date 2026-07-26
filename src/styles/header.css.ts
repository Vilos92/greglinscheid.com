import {globalStyle, style} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {hover, tapExtension} from './interaction';
import {fonts, palette} from './tokens';

/*
 * Styles.
 */

// Marks the scroll depth past which the header appears. Header.astro observes
// this element and flips `data-stuck` once it scrolls out of the viewport.
export const headerSentinel = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '1px',
  height: '8rem',
  pointerEvents: 'none'
});

export const header = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  // Below the skip link's 100, so a focused skip link still lands on top.
  zIndex: 50,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.4rem 1rem',
  // Reserves the Milo's box (40px, per Header.astro) while he sits absolutely
  // centered out of the flow on roomy screens.
  minHeight: 'calc(40px + 0.8rem)',
  backgroundColor: palette.pageBg,
  borderBottom: `1px solid ${palette.border}`,
  // Hidden by default. `visibility` flips after the transform's own duration
  // so the off-screen header drops out of the tab order without `display:
  // none`, which would kill the slide transition outright.
  transform: 'translateY(-100%)',
  visibility: 'hidden',
  transition: 'transform 200ms ease, visibility 0s 200ms',
  '@media': {
    [media.dark]: {
      backgroundColor: palette.pageBgDark,
      borderBottomColor: palette.borderDark
    },
    [media.reducedMotion]: {
      transition: 'none'
    },
    [media.highContrast]: {
      borderBottomWidth: '2px'
    }
  },
  selectors: {
    '&[data-stuck="true"]': {
      transform: 'none',
      visibility: 'visible',
      // Only the delay longhand, so the reduced-motion `transition: none` above
      // still wins here (a full shorthand in this more-specific rule would not).
      // Visibility flips immediately on the way in, so the header is focusable
      // as soon as it starts sliding into place.
      transitionDelay: '0s, 0s'
    }
  }
});

export const miloLink = style({
  display: 'flex',
  borderRadius: '8px',
  // Centered over the bar on roomy screens. On narrow ones he rejoins the flex
  // row on the left, where a centered cat would graze the wordmark's tail.
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  '@media': {
    [media.narrow]: {
      position: 'static',
      transform: 'none'
    }
  },
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${palette.accent}`,
      outlineOffset: '2px'
    }
  }
});

globalStyle(`${miloLink} svg`, {
  display: 'block'
});

// The header Milo morphs into the /milo page's giant Milo via the shared
// view-transition-name (opted in by BaseHead's @view-transition block). Named
// only while the header is on screen, so a navigation that lands on a hidden
// header gets the plain crossfade instead of Milo shrinking into an invisible
// corner.
globalStyle(`${header}[data-stuck="true"] svg[data-milo]`, {
  viewTransitionName: 'milo'
});

export const wordmark = style([
  {
    fontFamily: fonts.sans,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: palette.text,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    '@media': {
      [media.dark]: {
        color: palette.textDark
      }
    }
  },
  hover({textDecoration: 'underline'}),
  tapExtension('0.5rem', '0.25rem')
]);

export const nav = style({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem'
});

// Tap extension keeps a ~50px hit box without inflating the nav's line
// height; the nav's 1rem gap is at least double the 0.25rem horizontal
// extension, so adjacent links' hit boxes don't overlap.
export const navLink = style([
  {
    fontSize: '0.9rem',
    color: palette.textMuted,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    '@media': {
      [media.dark]: {
        color: palette.textMutedDark
      },
      [media.highContrast]: {
        textDecoration: 'underline',
        textDecorationThickness: '2px'
      }
    }
  },
  tapExtension('0.5rem', '0.25rem')
]);

globalStyle(`${navLink}:hover`, {
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
