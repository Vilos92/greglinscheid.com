import {globalStyle, style} from '@vanilla-extract/css';

import {media, touchTargetMin} from './breakpoints';

import {iconButton} from './icon-button.css';

/*
 * Styles.
 */

// The stage never scrolls, and opting out of native gestures keeps
// pointermove streaming for the whole drag so Milo can follow the finger.
export const stage = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  // Plain dvh, no vh fallback: the build's CSS minifier collapses same-property
  // fallback pairs to the last value anyway, and dvh is in every engine since 2022.
  height: '100dvh',
  overflow: 'hidden',
  touchAction: 'none',
  overscrollBehavior: 'none'
});

// The svg's width/height attributes are just defaults; this caps him to the
// viewport's short side so nothing clips on mobile (dvh so the iOS URL bar
// can't cause clipping).
globalStyle(`${stage} svg[data-milo]`, {
  width: 'min(92vw, 82dvh)',
  height: 'min(92vw, 82dvh)',
  // Pairs with the header Milo's name so the two morph across the navigation.
  viewTransitionName: 'milo'
});

// The safe-area insets keep the button reachable past notches and rounded
// corners on phones.
export const closeButton = style([
  iconButton,
  {
    position: 'fixed',
    top: 'calc(1rem + env(safe-area-inset-top))',
    right: 'calc(1rem + env(safe-area-inset-right))',
    width: '2.25rem',
    height: '2.25rem',
    '@media': {
      [media.coarsePointer]: {
        width: touchTargetMin,
        height: touchTargetMin
      }
    }
  }
]);
