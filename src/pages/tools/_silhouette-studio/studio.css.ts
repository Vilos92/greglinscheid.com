import {style} from '@vanilla-extract/css';

import {media, touchTargetMin} from '../../../styles/breakpoints';
import {fonts, palette} from '../../../styles/tokens';

/*
 * Constants.
 */

// Element ids the client controller (studio.ts) binds to. Kept here so markup,
// styles, and script share one source of truth.
export const ids = {
  viewport: 'studio-viewport',
  canvas: 'studio-canvas',
  dropZone: 'studio-drop-zone',
  fileInput: 'studio-file-input',
  status: 'studio-status',
  preview: 'studio-preview',
  bank: 'studio-bank',
  pitch: 'studio-pitch',
  spin: 'studio-spin',
  bankNumber: 'studio-bank-number',
  pitchNumber: 'studio-pitch-number',
  spinNumber: 'studio-spin-number',
  snap: 'studio-snap',
  reset: 'studio-reset',
  preset: 'studio-preset',
  forward: 'studio-forward',
  up: 'studio-up',
  color: 'studio-color',
  opacity: 'studio-opacity',
  shade: 'studio-shade',
  useVar: 'studio-use-var',
  ariaHidden: 'studio-aria-hidden',
  title: 'studio-title',
  download: 'studio-download',
  snippetInline: 'studio-snippet-inline',
  snippetMask: 'studio-snippet-mask',
  copyInline: 'studio-copy-inline',
  copyMask: 'studio-copy-mask'
} as const;

/*
 * Styles.
 */

export const intro = style({
  maxWidth: '46rem',
  marginBottom: '2em'
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem',
  alignItems: 'start',
  '@media': {
    [media.content]: {
      gridTemplateColumns: '1fr'
    }
  }
});

const pane = style({
  position: 'relative',
  aspectRatio: '1 / 1',
  width: '100%',
  borderRadius: '12px',
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.surface,
  overflow: 'hidden',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark,
      backgroundColor: palette.surfaceDark
    }
  }
});

export const viewport = style([
  pane,
  {
    cursor: 'grab',
    touchAction: 'none',
    selectors: {
      '&[data-dragging="true"]': {
        cursor: 'grabbing'
      }
    }
  }
]);

export const canvas = style({
  display: 'block',
  width: '100%',
  height: '100%'
});

// Centred export-frame guide (the 512 canvas, with the 430 fit region inset).
export const scanFrame = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1
});

export const dropZone = style({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '1.5rem',
  textAlign: 'center',
  color: palette.textMuted,
  border: `2px dashed ${palette.border}`,
  borderRadius: '12px',
  backgroundColor: palette.surface,
  cursor: 'pointer',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark,
      borderColor: palette.borderDark,
      backgroundColor: palette.surfaceDark
    },
    [media.reducedMotion]: {
      transition: 'none'
    }
  },
  selectors: {
    '&[data-dragover="true"]': {
      borderColor: palette.accent,
      color: palette.text
    },
    '&[data-hidden="true"]': {
      display: 'none'
    }
  }
});

export const status = style({
  marginTop: '0.75rem',
  minHeight: '1.4em',
  fontSize: '0.85rem',
  color: palette.textMuted,
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  },
  selectors: {
    '&[data-error="true"]': {
      color: palette.linkHover
    }
  }
});

// Inline preview host. `color` drives currentColor output; `--icon-color`
// drives the var() output. The script sets both plus opacity at runtime.
export const preview = style([
  pane,
  {
    display: 'grid',
    placeItems: 'center',
    padding: '12%',
    color: palette.text,
    '@media': {
      [media.dark]: {
        color: palette.textDark
      }
    }
  }
]);

export const controls = style({
  marginTop: '1.5rem',
  display: 'grid',
  gap: '1.25rem'
});

export const fieldset = style({
  display: 'grid',
  gap: '0.85rem',
  margin: 0,
  padding: '1.1rem 1.25rem',
  border: `1px solid ${palette.border}`,
  borderRadius: '12px',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark
    }
  }
});

export const legend = style({
  padding: '0 0.4rem',
  fontWeight: 600,
  fontSize: '0.95rem'
});

export const sliderRow = style({
  display: 'grid',
  gridTemplateColumns: '4.5rem 1fr 4rem',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    [media.narrow]: {
      gridTemplateColumns: '3.5rem 1fr 3.25rem'
    }
  }
});

export const slider = style({
  width: '100%',
  accentColor: palette.accent
});

export const number = style({
  width: '100%',
  fontFamily: fonts.mono,
  fontSize: '0.85rem',
  padding: '0.3rem 0.4rem',
  textAlign: 'right',
  color: 'inherit',
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '6px',
  '@media': {
    [media.dark]: {
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    }
  }
});

export const fieldRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.75rem'
});

export const label = style({
  fontSize: '0.9rem'
});

export const select = style({
  fontFamily: fonts.mono,
  fontSize: '0.85rem',
  padding: '0.35rem 0.5rem',
  color: 'inherit',
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '6px',
  '@media': {
    [media.dark]: {
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    }
  }
});

export const buttonRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem'
});

export const button = style({
  fontFamily: fonts.sans,
  fontSize: '0.9rem',
  fontWeight: 600,
  padding: '0.5rem 0.9rem',
  color: palette.text,
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '8px',
  cursor: 'pointer',
  '@media': {
    [media.dark]: {
      color: palette.textDark,
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    },
    [media.coarsePointer]: {
      minHeight: touchTargetMin
    }
  },
  selectors: {
    '&:hover': {
      borderColor: palette.accent
    },
    '&:focus-visible': {
      outline: `2px solid ${palette.accent}`,
      outlineOffset: '2px'
    }
  }
});

export const checkboxRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem'
});

export const colorInput = style({
  width: '2.75rem',
  height: '2.25rem',
  padding: 0,
  border: `1px solid ${palette.border}`,
  borderRadius: '6px',
  background: 'none',
  cursor: 'pointer',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark
    }
  }
});

export const titleInput = style({
  flex: 1,
  minWidth: '10rem',
  fontFamily: fonts.sans,
  fontSize: '0.9rem',
  padding: '0.35rem 0.5rem',
  color: 'inherit',
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '6px',
  '@media': {
    [media.dark]: {
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    }
  },
  selectors: {
    '&:disabled': {
      opacity: 0.5
    }
  }
});

export const snippets = style({
  marginTop: '2rem',
  display: 'grid',
  gap: '1.25rem'
});

export const snippetBlock = style({
  position: 'relative'
});

export const snippetHeading = style({
  margin: '0 0 0.5rem',
  fontSize: '0.95rem',
  fontWeight: 600
});

export const snippetPre = style({
  margin: 0,
  padding: '0.9rem 1rem',
  overflowX: 'auto',
  fontFamily: fonts.mono,
  fontSize: '0.8rem',
  lineHeight: 1.5,
  color: palette.codeText,
  backgroundColor: palette.codeBg,
  borderRadius: '8px',
  '@media': {
    [media.dark]: {
      color: palette.codeTextDark,
      backgroundColor: palette.codeBgDark
    }
  }
});

export const copyButton = style([
  button,
  {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.3rem 0.6rem'
  }
]);

export const attribution = style({
  marginTop: '2.5rem',
  fontSize: '0.85rem',
  color: palette.textMuted,
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});
