import {breakpoints} from './breakpoints';

/*
 * Constants.
 */

export const fonts = {
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  sans: '"Source Sans 3", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace'
} as const;

export const palette = {
  text: '#1c1917',
  textMuted: '#6b6560',
  pageBg: '#f7f4ef',
  surface: '#fffdf9',
  border: '#ddd6cb',
  link: '#9a3412',
  linkHover: '#c2410c',
  accent: '#b45309',
  textDark: '#ede9e3',
  textMutedDark: '#a8a29e',
  pageBgDark: '#171412',
  surfaceDark: '#211e1b',
  borderDark: '#3f3a36',
  linkDark: '#fdba74',
  linkHoverDark: '#fed7aa',
  codeBg: '#ebe5dc',
  codeBgDark: '#2a2622',
  codeText: '#1c1917',
  codeTextDark: '#e7e2db'
} as const;

export const layout = {
  contentWidth: breakpoints.content
} as const;
