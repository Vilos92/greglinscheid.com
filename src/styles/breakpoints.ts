/*
 * Constants.
 */

/** Width breakpoints — layout and typography only. Use pointer queries for tap targets. */
export const breakpoints = {
  /** Stack blog cards, tighten horizontal padding. */
  narrow: '480px',
  /** Content column cap. Step base font size down. */
  content: '720px'
} as const;

/** WCAG 2.5.5 recommended minimum touch target (level AAA). */
export const touchTargetMin = '44px';

/*
 * Helpers.
 */

export const media = {
  narrow: `(max-width: ${breakpoints.narrow})`,
  content: `(max-width: ${breakpoints.content})`,
  dark: '(prefers-color-scheme: dark)',
  coarsePointer: '(pointer: coarse)',
  finePointer: '(pointer: fine)',
  /** Hover states belong behind this gate, since a tap leaves bare `:hover` stuck on. */
  hover: '(hover: hover)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: more)'
} as const;
