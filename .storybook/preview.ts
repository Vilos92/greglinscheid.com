import {definePreview} from '@storybook-astro/framework';

/*
 * Config.
 */

export default definePreview({
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
});
