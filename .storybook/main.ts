import type {StorybookConfig} from '@storybook-astro/framework';

/*
 * Config.
 */

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  framework: {
    name: '@storybook-astro/framework',
    options: {}
  }
};

export default config;
