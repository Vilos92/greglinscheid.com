/*
 * Types.
 */

export type Theme = 'light' | 'dark';

export type ThemeOverride = Theme | undefined;

/*
 * Constants.
 */

export const THEME_STORAGE_KEY = 'greglinscheid.com:theme';

export const themePageBackground = {
  light: '#f7f4ef',
  dark: '#171412'
} as const;

/*
 * Helpers.
 */

export function checkIsTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function readThemeOverride(value: string | null): ThemeOverride {
  return checkIsTheme(value) ? value : undefined;
}

export function computeResolvedTheme(systemTheme: Theme, override: ThemeOverride): Theme {
  return override ?? systemTheme;
}

/** Returns the explicit override required after a user switches the visible theme. */
export function computeNextThemeOverride(systemTheme: Theme, override: ThemeOverride): ThemeOverride {
  const resolvedTheme = computeResolvedTheme(systemTheme, override);
  const nextTheme: Theme = resolvedTheme === 'light' ? 'dark' : 'light';

  return nextTheme === systemTheme ? undefined : nextTheme;
}
