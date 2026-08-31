import {breakpoints} from './breakpoints';

export {palette} from './theme.css';

/*
 * Constants.
 */

export const fonts = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  sans: '"Source Sans 3", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace'
} as const;

export const layout = {
  contentWidth: breakpoints.content
} as const;
