import Milo from './Milo.astro';

/*
 * Stories.
 */

export default {
  title: 'Components/Milo',
  component: Milo,
  args: {
    size: 400
  },
  argTypes: {
    size: {
      control: {type: 'range', min: 100, max: 800, step: 20},
      description: 'Rendered width and height in CSS pixels.'
    }
  },
  parameters: {
    // Center the face so there is room on every side to play with the cursor tracking.
    layout: 'centered',
    backgrounds: {
      // A muted sage that complements Milo's pinks and echoes the iris gold, mid-valued so
      // the white whiskers stay visible.
      options: {
        sage: {name: 'Sage', value: '#9aa08a'}
      }
    }
  },
  globals: {
    backgrounds: {value: 'sage'}
  }
};

/**
 * Milo the cat watches the cursor anywhere on the page — including outside his square — with
 * the head easing after it, the features sliding a little further, and the pupils further
 * still. He blinks on his own schedule, with the occasional languid contented-cat slow blink.
 * Sweep the cursor past the edges of the viewport to see the tracking saturate.
 */
export const Default = {};
