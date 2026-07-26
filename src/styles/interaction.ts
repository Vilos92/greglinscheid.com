import type {GlobalStyleRule, StyleRule} from '@vanilla-extract/css';

import {media} from './breakpoints';

/*
 * Types.
 */

type SelectorRule = NonNullable<StyleRule['selectors']>[string];

/*
 * Helpers.
 */

/**
 * A hover state that only exists on devices that can actually hover. On touch
 * screens a bare `:hover` sticks after a tap until the next tap elsewhere, so
 * the rule is gated behind `@media (hover: hover)`. Compose via the array
 * form: `style([base, hover({...})])`.
 */
export function hover(body: SelectorRule): StyleRule {
  return {
    '@media': {
      [media.hover]: {
        selectors: {'&:hover': body}
      }
    }
  };
}

/**
 * The rule body for a `globalStyle('x:hover', ...)` call — the counterpart of
 * `hover` for hover styles that vanilla-extract only allows as global rules.
 * Applies only on hover-capable devices, with an optional dark-scheme override.
 */
export function hoverRule(body: GlobalStyleRule, darkBody?: GlobalStyleRule): GlobalStyleRule {
  return {
    '@media': {
      [media.hover]: body,
      ...(darkBody === undefined ? {} : {[`${media.hover} and ${media.dark}`]: darkBody})
    }
  };
}

/**
 * Grows a control's coarse-pointer hit box with padding and cancels the growth
 * with an equal negative margin, so the layout is identical on every device.
 * Adjacent targets closer than the extension overlap; the later element in DOM
 * order wins the overlap, so keep gaps at least as wide as `horizontal`.
 */
export function tapExtension(vertical: string, horizontal: string = vertical): StyleRule {
  return {
    '@media': {
      [media.coarsePointer]: {
        padding: `${vertical} ${horizontal}`,
        margin: `-${vertical} -${horizontal}`
      }
    }
  };
}
