import {globalStyle, style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';
import {fonts, layout, palette} from './tokens';

/*
 * Constants.
 */

export const MAIN_CONTENT_ID = 'main-content';

/*
 * Styles.
 */

globalStyle('html', {
  fontFamily: fonts.sans,
  fontSize: '20px',
  lineHeight: 1.65,
  color: palette.text,
  backgroundColor: palette.pageBg,
  // Enables CSS `light-dark()` on code blocks. Dark vars fallback in `code.css.ts`.
  colorScheme: 'light dark',
  textRendering: 'optimizeLegibility',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  '@media': {
    [media.dark]: {
      color: palette.textDark,
      backgroundColor: palette.pageBgDark
    },
    [media.content]: {
      fontSize: '18px'
    },
    [media.narrow]: {
      fontSize: '17px'
    }
  }
});

globalStyle('body', {
  margin: 0,
  padding: 0,
  textAlign: 'left',
  wordWrap: 'break-word',
  overflowWrap: 'break-word'
});

globalStyle('a', {
  color: palette.link,
  textDecoration: 'underline',
  textUnderlineOffset: '0.15em',
  '@media': {
    [media.dark]: {
      color: palette.linkDark
    },
    [media.coarsePointer]: {
      textDecorationThickness: '2px'
    },
    [media.highContrast]: {
      textDecorationThickness: '2px',
      fontWeight: 600
    }
  }
});

globalStyle('a:hover', {
  color: palette.linkHover,
  '@media': {
    [media.dark]: {
      color: palette.linkHoverDark
    }
  }
});

globalStyle('a:focus-visible', {
  outline: `2px solid ${palette.accent}`,
  outlineOffset: '3px',
  borderRadius: '2px',
  '@media': {
    [media.highContrast]: {
      outlineWidth: '3px',
      outlineOffset: '4px'
    }
  }
});

globalStyle(`#${MAIN_CONTENT_ID}:focus`, {
  outline: 'none'
});

globalStyle('img', {
  maxWidth: '100%',
  height: 'auto',
  borderRadius: '10px'
});

globalStyle('blockquote', {
  margin: '1.25em 0',
  paddingLeft: '1.1em',
  borderLeft: `3px solid ${palette.accent}`,
  fontSize: '1.05em',
  color: palette.textMuted,
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});

globalStyle('hr', {
  border: 'none',
  borderTop: `1px solid ${palette.border}`,
  margin: '2rem 0',
  '@media': {
    [media.dark]: {
      borderTopColor: palette.borderDark
    }
  }
});

globalStyle('.sr-only', {
  border: 0,
  padding: 0,
  margin: 0,
  position: 'absolute',
  height: '1px',
  width: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap'
});

export const skipLink = style({
  position: 'fixed',
  top: '1rem',
  left: '1rem',
  zIndex: 100,
  padding: '0.75rem 1rem',
  fontFamily: fonts.sans,
  fontSize: '0.9rem',
  fontWeight: 600,
  color: palette.text,
  backgroundColor: palette.surface,
  border: `2px solid ${palette.accent}`,
  borderRadius: '8px',
  textDecoration: 'none',
  transform: 'translateY(-250%)',
  transition: 'transform 150ms ease',
  '@media': {
    [media.dark]: {
      color: palette.textDark,
      backgroundColor: palette.surfaceDark,
      borderColor: palette.linkDark
    },
    [media.coarsePointer]: {
      minHeight: touchTargetMin,
      display: 'inline-flex',
      alignItems: 'center'
    },
    [media.reducedMotion]: {
      transition: 'none'
    },
    [media.highContrast]: {
      borderWidth: '3px'
    }
  },
  selectors: {
    '&:focus-visible': {
      transform: 'translateY(0)'
    }
  }
});

export const main = style({
  width: layout.contentWidth,
  maxWidth: 'calc(100% - 2em)',
  margin: '0 auto',
  padding: '3em 1em',
  '@media': {
    [media.content]: {
      padding: '1.5em 1em'
    },
    [media.narrow]: {
      padding: '1.25em 0.75em',
      maxWidth: 'calc(100% - 1em)'
    }
  }
});

// Wide container for interactive pages that escape the prose column (e.g. tools).
export const mainFullBleed = style({
  // Keep the side padding inside the 100% width so it never overflows the viewport.
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2em 1.5em',
  '@media': {
    [media.content]: {
      padding: '1.5em 1em'
    },
    [media.narrow]: {
      padding: '1.25em 0.75em'
    }
  }
});
