import Milo from './Milo.astro';

/*
 * Stories.
 */

export default {
  title: 'Components/Milo',
  component: Milo,
  parameters: {
    // Center the face so there is room on every side to play with the cursor tracking.
    layout: 'centered'
  }
};

/**
 * Milo watches the cursor anywhere on the page — including outside his square — with the head
 * easing after it and the features sliding a little further for depth. He blinks on his own
 * schedule. Sweep the cursor past the edges of the viewport to see the tracking saturate.
 */
export const Default = {};
