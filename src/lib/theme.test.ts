import {describe, expect, it} from 'vitest';

import {computeNextThemeOverride, computeResolvedTheme, readThemeOverride} from './theme';

/*
 * Tests.
 */

describe('theme state', () => {
  it('follows the system theme without an override', () => {
    expect(computeResolvedTheme('light', undefined)).toBe('light');
    expect(computeResolvedTheme('dark', undefined)).toBe('dark');
  });

  it('keeps a valid stored override and discards other stored values', () => {
    expect(readThemeOverride('dark')).toBe('dark');
    expect(readThemeOverride('light')).toBe('light');
    expect(readThemeOverride('system')).toBeUndefined();
    expect(readThemeOverride(null)).toBeUndefined();
  });

  it('stores an override only when switching away from the system theme', () => {
    expect(computeNextThemeOverride('light', undefined)).toBe('dark');
    expect(computeNextThemeOverride('dark', undefined)).toBe('light');
    expect(computeNextThemeOverride('light', 'dark')).toBeUndefined();
    expect(computeNextThemeOverride('dark', 'light')).toBeUndefined();
  });

  it('keeps an explicit override when the system later matches it', () => {
    expect(computeNextThemeOverride('dark', 'dark')).toBe('light');
  });
});
