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
  x: 'studio-x',
  y: 'studio-y',
  z: 'studio-z',
  xNumber: 'studio-x-number',
  yNumber: 'studio-y-number',
  zNumber: 'studio-z-number',
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

// Viewport, preview, and the two control cards share one grid so their order can
// change with width: each pane sits beside its controls when wide, and they
// interleave (viewport, pose, preview, output) when stacked.
export const poseGrid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gridTemplateAreas: '"viewport preview" "pose output"',
  gap: '1.5rem',
  '@media': {
    [media.content]: {
      gridTemplateColumns: '1fr',
      gridTemplateAreas: '"viewport" "pose" "preview" "output"'
    }
  }
});

export const areaViewport = style({gridArea: 'viewport', alignSelf: 'start', minWidth: 0});
export const areaPreview = style({gridArea: 'preview', alignSelf: 'start', minWidth: 0});
export const areaPose = style({gridArea: 'pose'});
export const areaOutput = style({gridArea: 'output'});

// Wraps a pane's header row plus the pane itself so the header sits above the box
// (outside the canvas) instead of floating inside it.
export const paneBlock = style({minWidth: 0});

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
    // Dim the model behind a scrim and show the prompt in plain white, so it
    // reads clearly over any model in either theme (it only appears on drag-over).
    '&[data-dragover="true"]': {
      borderColor: palette.accent,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      color: '#ffffff'
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

export const status = style({
  fontSize: '0.85rem',
  color: palette.textMuted,
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  },
  selectors: {
    // Only take up space (and reserve a line) once it actually holds a message,
    // so an empty status doesn't leave an uneven gap above the exported SVG.
    // Stays in flow rather than display:none so the live region still announces.
    '&:not(:empty)': {
      marginTop: '0.75rem',
      minHeight: '1.4em'
    },
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

// Flex column; the pose grid stretches both cards to equal height.
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

// Style picker: stacked radios so all modes stay visible.
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

// Trailing Pose row: the snap toggle on the left, Reset pushed to the right edge.
export const snapRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem'
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
export const snippetBlock = style({
  marginTop: '1.5rem',
  // Let the grid track shrink instead of stretching to the snippet's width.
  minWidth: 0
});

// Header row shared by the Model/SVG panes and the exported-SVG block: a heading
// on the left and an icon button pushed to the right.
export const sectionHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginBottom: '0.5rem'
});

export const sectionHeading = style({
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
  // The exported SVG is one long line. We wrap it instead of blowing out the width.
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
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark,
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
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

// Icon + text button that lives in a pane header (Upload on Model, Download on
// SVG). The icon is vertically centred with a gap to the label.
export const headButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  flexShrink: 0,
  padding: '0.35rem 0.65rem',
  fontFamily: fonts.sans,
  fontSize: '0.85rem',
  fontWeight: 600,
  color: palette.textMuted,
  backgroundColor: palette.surface,
  border: `1px solid ${palette.border}`,
  borderRadius: '8px',
  cursor: 'pointer',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark,
      backgroundColor: palette.surfaceDark,
      borderColor: palette.borderDark
    },
    [media.coarsePointer]: {
      minHeight: touchTargetMin
    }
  },
  selectors: {
    '&:hover': {
      color: palette.accent,
      borderColor: palette.accent
    },
    '&:focus-visible': {
      outline: `2px solid ${palette.accent}`,
      outlineOffset: '2px'
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
