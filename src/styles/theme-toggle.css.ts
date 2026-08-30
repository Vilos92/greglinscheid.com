import {style} from '@vanilla-extract/css';

import {media} from './breakpoints';
import {tapExtension} from './interaction';

import {iconButton} from './icon-button.css';

/*
 * Styles.
 */

export const themeToggle = style([
  iconButton,
  {
    order: 1,
    width: '2.125rem',
    height: '2.125rem',
    '@media': {
      [media.narrow]: {
        order: 0
      }
    }
  },
  tapExtension('0.3rem')
]);

const icon = {
  width: '1rem',
  height: '1rem',
  fill: 'none',
  stroke: 'currentcolor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8
} as const;

export const lightThemeIcon = style({
  ...icon,
  display: 'none',
  selectors: {
    [`${themeToggle}[data-theme-icon="light"] &`]: {
      display: 'block'
    }
  }
});

export const darkThemeIcon = style({
  ...icon,
  display: 'none',
  selectors: {
    [`${themeToggle}[data-theme-icon="dark"] &`]: {
      display: 'block'
    }
  }
});
