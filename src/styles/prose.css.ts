import {globalStyle, style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';
import {fonts, palette} from './tokens';

/*
 * Styles.
 */

// Wrapper class only — descendant rules use globalStyle because VE style() cannot
// target child elements (& h1). Needed for markdown <Content /> and unclassed markup.
// https://vanilla-extract.style/documentation/global-api/global-style/
export const prose = style({});

globalStyle(`${prose} h1`, {
  fontFamily: fonts.display,
  fontSize: '2.35em',
  fontWeight: 600,
  lineHeight: 1.15,
  margin: '0 0 0.5rem',
  letterSpacing: '-0.02em',
  '@media': {
    [media.narrow]: {
      fontSize: '2em'
    }
  }
});

globalStyle(`${prose} h2`, {
  fontFamily: fonts.display,
  fontSize: '1.65em',
  fontWeight: 600,
  lineHeight: 1.2,
  margin: '2rem 0 0.5rem',
  letterSpacing: '-0.01em'
});

globalStyle(`${prose} h3`, {
  fontSize: '1.4em',
  lineHeight: 1.2,
  margin: '1.5rem 0 0.5rem'
});

globalStyle(`${prose} p`, {
  margin: '0 0 1.25em'
});

globalStyle(`${prose} ul`, {
  margin: '0 0 1.25em',
  paddingLeft: '1.5em'
});

globalStyle(`${prose} ol`, {
  margin: '0 0 1.25em',
  paddingLeft: '1.5em'
});

globalStyle(`${prose} li`, {
  marginBottom: '0.35em'
});

globalStyle(`${prose} strong`, {
  fontWeight: 700
});

globalStyle(`${prose} b`, {
  fontWeight: 700
});

globalStyle(`${prose} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '1.25em'
});

globalStyle(`${prose} th`, {
  border: `1px solid ${palette.border}`,
  padding: '0.5em 0.75em',
  textAlign: 'left',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark
    }
  }
});

globalStyle(`${prose} td`, {
  border: `1px solid ${palette.border}`,
  padding: '0.5em 0.75em',
  textAlign: 'left',
  '@media': {
    [media.dark]: {
      borderColor: palette.borderDark
    }
  }
});

export const postMeta = style({
  marginBottom: '1.5rem'
});

export const siteTitle = style({
  letterSpacing: '-0.03em'
});

export const postTitle = style({
  margin: '0 0 0.25rem',
  fontFamily: fonts.display,
  fontWeight: 600,
  letterSpacing: '-0.02em'
});

export const postDate = style({
  color: palette.textMuted,
  fontSize: '0.95em',
  '@media': {
    [media.dark]: {
      color: palette.textMutedDark
    }
  }
});

export const heroImage = style({
  width: '13rem',
  maxWidth: '100%',
  flexShrink: 0,
  marginBottom: '1rem'
});

export const inlineImage = style({
  width: '13rem',
  maxWidth: '100%'
});

export const blogList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
});

export const blogListItem = style({});

export const blogListLink = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '1rem',
  textDecoration: 'none',
  color: 'inherit',
  borderRadius: '10px',
  '@media': {
    [media.narrow]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.75rem'
    },
    [media.coarsePointer]: {
      padding: '0.35rem 0',
      minHeight: touchTargetMin
    }
  }
});

export const blogListTitle = style({
  margin: '0 0 0.25rem',
  fontSize: '1.25em'
});

export const centeredSection = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center'
});
