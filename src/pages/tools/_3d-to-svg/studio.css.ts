import {keyframes, style} from '@vanilla-extract/css';

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
  color: 'studio-color',
  mode: 'studio-mode',
  download: 'studio-download',
  snippet: 'studio-snippet',
  snippetInline: 'studio-snippet-inline',
  copyInline: 'studio-copy-inline',
  loading: 'studio-loading',
  loadButton: 'studio-load'
} as const;

/*
 * Styles.
 */

export const intro = style({
  marginBottom: '2em'
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '1.5rem',
  alignItems: 'start',
  '@media': {
    [media.content]: {
      gridTemplateColumns: '1fr'
    }
  }
});

const pane = style({
  boxSizing: 'border-box',
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
  position: 'absolute',
  inset: 0,
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

// Centred loading overlay shown while a model parses, so the default model never
// flashes the drop prompt before it appears.
export const loadingOverlay = style({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  selectors: {
    '&[data-hidden="true"]': {
      display: 'none'
    }
  }
});

const spin = keyframes({
  to: {transform: 'rotate(360deg)'}
});

export const spinner = style({
  width: '2.25rem',
  height: '2.25rem',
  borderRadius: '50%',
  border: `3px solid ${palette.border}`,
  borderTopColor: palette.accent,
  animation: `${spin} 0.8s linear infinite`,
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark,
      borderTopColor: palette.accent
    },
    [media.reducedMotion]: {
      animation: 'none'
    }
  }
});

// Row under the viewport: the load button plus any status/error text.
export const loadRow = style({
  marginTop: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap'
});

export const status = style({
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

// Inline preview host. `color` drives the SVG's currentColor fill at runtime.
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

// Flex column so the trailing button row can be pinned to the card's bottom
// (the cards are stretched to equal height by controlsRow).
export const fieldset = style({
  display: 'flex',
  flexDirection: 'column',
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

// Style picker: stacked radios so all three modes stay visible (switching them
// is the point of the tool), rather than hidden behind a select.
export const modeField = style({
  display: 'grid',
  gap: '0.5rem'
});

export const modeGroup = style({
  display: 'grid',
  gap: '0.4rem'
});

export const modeOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
  accentColor: palette.accent,
  cursor: 'pointer'
});

// `marginTop: auto` drops the row to the bottom of its flex-column card so Reset
// and Download sit at the cards' lower edge regardless of content height.
export const buttonRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem',
  marginTop: 'auto'
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

// The Pose and Output control cards sit side-by-side on wide screens and stack
// when narrow. The default `stretch` alignment keeps both cards the same height
// regardless of content. The exported-SVG block spans full width below them.
export const controlsRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '1.25rem',
  '@media': {
    [media.content]: {
      gridTemplateColumns: '1fr'
    }
  }
});

export const snippetBlock = style({
  // Let the grid track shrink instead of stretching to the snippet's width.
  minWidth: 0
});

export const snippetHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginBottom: '0.5rem'
});

export const snippetHeading = style({
  margin: 0,
  fontSize: '0.95rem',
  fontWeight: 600
});

// Mirrors shiki's github-light/github-dark themes so this matches the <Code> block.
export const snippetPre = style({
  margin: 0,
  padding: '1.1em 1.25em',
  maxWidth: '100%',
  maxHeight: '15rem',
  overflowY: 'auto',
  // The exported SVG is one long line; wrap it instead of blowing out the width.
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: fonts.mono,
  fontSize: '0.82em',
  lineHeight: 1.55,
  color: '#1f2328',
  backgroundColor: '#ffffff',
  border: `1px solid ${palette.border}`,
  borderRadius: '10px',
  '@media': {
    [media.dark]: {
      color: '#e1e4e8',
      backgroundColor: '#24292e',
      borderColor: palette.borderDark
    }
  },
  selectors: {
    // While a model loads, centre a spinner where the SVG markup will land.
    '&[data-loading="true"]': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '6rem'
    },
    '&[data-loading="true"]::after': {
      content: '""',
      width: '2.25rem',
      height: '2.25rem',
      borderRadius: '50%',
      border: `3px solid ${palette.border}`,
      borderTopColor: palette.accent,
      animation: `${spin} 0.8s linear infinite`
    }
  }
});

// Token colors mirror shiki's github-light / github-dark themes.
export const codeTag = style({color: '#116329', '@media': {[media.dark]: {color: '#7ee787'}}});
export const codeAttr = style({color: '#0550ae', '@media': {[media.dark]: {color: '#79b8ff'}}});
export const codeString = style({color: '#0a3069', '@media': {[media.dark]: {color: '#a5d6ff'}}});

// Icon copy button (gdex-style): fixed size so it never resizes on click.
export const copyButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '2rem',
  height: '2rem',
  padding: 0,
  color: palette.textMuted,
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'color 120ms ease, border-color 120ms ease',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark,
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    },
    [media.reducedMotion]: {
      transition: 'none'
    },
    [media.coarsePointer]: {
      width: touchTargetMin,
      height: touchTargetMin
    }
  },
  selectors: {
    '&:hover': {
      borderColor: palette.accent
    },
    '&:focus-visible': {
      outline: `2px solid ${palette.accent}`,
      outlineOffset: '2px'
    },
    '&[data-copied="true"]': {
      color: palette.accent,
      borderColor: palette.accent
    }
  }
});

export const copyIconDefault = style({
  width: '16px',
  height: '16px',
  display: 'block',
  selectors: {
    [`${copyButton}[data-copied="true"] &`]: {display: 'none'}
  }
});

export const copyIconCopied = style({
  width: '16px',
  height: '16px',
  display: 'none',
  selectors: {
    [`${copyButton}[data-copied="true"] &`]: {display: 'block'}
  }
});

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
