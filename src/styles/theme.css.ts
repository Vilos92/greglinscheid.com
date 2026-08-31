import {createVar, globalStyle} from '@vanilla-extract/css';

import {themePageBackground} from '../lib/theme';
import {media} from './breakpoints';

/*
 * Constants.
 */

export const palette = {
  text: createVar(),
  textMuted: createVar(),
  pageBg: createVar(),
  surface: createVar(),
  border: createVar(),
  link: createVar(),
  linkHover: createVar(),
  codeBg: createVar(),
  codeText: createVar(),
  accent: '#b45309'
} as const;

const lightPalette = {
  [palette.text]: '#1c1917',
  [palette.textMuted]: '#6b6560',
  [palette.pageBg]: themePageBackground.light,
  [palette.surface]: '#fffdf9',
  [palette.border]: '#ddd6cb',
  [palette.link]: '#9a3412',
  [palette.linkHover]: '#c2410c',
  [palette.codeBg]: '#ebe5dc',
  [palette.codeText]: '#1c1917'
};

const darkPalette = {
  [palette.text]: '#ede9e3',
  [palette.textMuted]: '#a8a29e',
  [palette.pageBg]: themePageBackground.dark,
  [palette.surface]: '#211e1b',
  [palette.border]: '#3f3a36',
  [palette.link]: '#fdba74',
  [palette.linkHover]: '#fed7aa',
  [palette.codeBg]: '#2a2622',
  [palette.codeText]: '#e7e2db'
};

/*
 * Styles.
 */

globalStyle('html', {
  vars: lightPalette,
  '@media': {
    [media.dark]: {
      vars: darkPalette
    }
  }
});

globalStyle('html[data-theme="light"]', {
  colorScheme: 'light',
  vars: lightPalette
});

globalStyle('html[data-theme="dark"]', {
  colorScheme: 'dark',
  vars: darkPalette
});
