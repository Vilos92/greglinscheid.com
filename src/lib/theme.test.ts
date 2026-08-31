import {describe, expect, it, vi} from 'vitest';

import {
  computeNextThemeOverride,
  computeResolvedTheme,
  persistThemeOverride,
  readThemeOverride,
  THEME_STORAGE_KEY
} from './theme';

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

  it('stores an override when switching away from the system theme', () => {
    expect(computeNextThemeOverride('light', undefined)).toBe('dark');
    expect(computeNextThemeOverride('dark', undefined)).toBe('light');
  });

  it('removes storage when toggling an override back to the system theme', () => {
    const storage = {removeItem: vi.fn(), setItem: vi.fn()};
    const nextOverride = computeNextThemeOverride('light', 'dark');

    expect(nextOverride).toBeUndefined();

    persistThemeOverride(storage, nextOverride);

    expect(storage.removeItem).toHaveBeenCalledOnce();
    expect(storage.removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('keeps an override when the system later matches it', () => {
    const storage = {removeItem: vi.fn(), setItem: vi.fn()};
    const nextOverride = computeNextThemeOverride('dark', 'dark');

    expect(nextOverride).toBe('light');

    persistThemeOverride(storage, nextOverride);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
