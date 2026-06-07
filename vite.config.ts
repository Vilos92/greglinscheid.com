import {defineConfig} from 'vite-plus';

/*
 * Constants.
 */

const REPO_TS_FMT_OPTIONS = {
  arrowParens: 'avoid' as const,
  bracketSpacing: false,
  printWidth: 110,
  trailingComma: 'none' as const,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  sortImports: true,
  sortPackageJson: true
};

/*
 * Config.
 */

export default defineConfig({
  staged: {
    '*': 'vp check --fix'
  },
  fmt: REPO_TS_FMT_OPTIONS,
  lint: {
    options: {typeAware: true, typeCheck: true},
    rules: {
      curly: ['error', 'all'],
      'no-nested-ternary': 'error'
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true
  }
});
