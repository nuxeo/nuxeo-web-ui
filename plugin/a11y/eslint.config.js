import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },

  js.configs.recommended,

  {
    files: ['test/**/*.js', 'test/specs/**/*.js', 'test/**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
        browser: 'readonly',
        context: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_$' }],
    },
  },

  {
    files: ['wdio.conf.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        browser: 'readonly',
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
  },

  prettier,
];
