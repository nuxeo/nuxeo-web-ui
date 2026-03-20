import js from '@eslint/js';
import html from 'eslint-plugin-html';
import importPlugin from 'eslint-plugin-import';
import { configs as wcConfigs } from 'eslint-plugin-wc';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

import ftestConfig from './ftest/eslint.config.mjs';
import webUiFtestConfig from './packages/nuxeo-web-ui-ftest/eslint.config.js';
import a11yConfig from './plugin/a11y/eslint.config.js';
import spreadsheetConfig from './addons/nuxeo-spreadsheet/eslint.config.mjs';

export default [
  {
    ignores: [
      '**/metrics/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/target/**',
      '**/dist/**',
      '**/.tmp/**',
      'index.html',
      '**/vendor/**',
      'addons/nuxeo-platform-3d/controls/**',
      'addons/nuxeo-platform-3d/loaders/**',
    ],
  },

  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },

  js.configs.recommended,

  // Lint inline <script> blocks in HTML (Polymer templates/layouts)
  {
    files: ['**/*.html'],
    plugins: { html },
    settings: {
      'html/indent': '+2',
      'html/report-bad-indent': 'error',
    },
    languageOptions: {
      globals: {
        Polymer: 'readonly',
      },
    },
  },

  // Web Components best practices (no Lit required)
  wcConfigs['flat/recommended'],

  {
    plugins: {
      import: importPlugin,
      'no-only-tests': noOnlyTests,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        Nuxeo: 'writable',
        jQuery: 'readonly',
        THREE: 'readonly',
      },
    },
    rules: {
      'no-only-tests/no-only-tests': 'error',

      'new-cap': ['error', { capIsNewExceptions: ['Polymer'] }],

      // Keep the upgrade low-churn: these "newer" recommended rules would
      // otherwise force unrelated code changes across the repo.
      'no-constant-binary-expression': 'off',
      'no-setter-return': 'off',
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
          varsIgnorePattern: '^_$',
        },
      ],

      'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: true }],
      'arrow-parens': ['error', 'always'],
      'class-methods-use-this': 'off',
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
      'consistent-return': 'off',
      eqeqeq: ['error', 'smart'],
      'func-names': 'off',
      'max-len': [
        'error',
        120,
        2,
        {
          ignoreUrls: true,
          ignoreComments: false,
          ignorePattern: `(^[ \\t]*\\w+\\$?='[^']+'$|^[ \\t]*\\w+\\$?="[^"]+"$|^import[^;]+;$)`,
        },
      ],
      'no-alert': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-multi-assign': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-sequences': 'off',
      'no-underscore-dangle': 'off',
      'padded-blocks': 'off',
    },
  },

  {
    files: [
      'karma.conf.js',
      'webpack.config.js',
      '**/*.conf.js',
      '**/*.config.js',
      '**/gulpfile.js',
      'packages/nuxeo-designer-catalog/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
  },

  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
    rules: {
      'import/no-dynamic-require': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'global-require': 'off',
      'no-console': 'off',
    },
  },

  {
    files: ['addons/**/ftest/features/step_definitions/**/*.js'],
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-unused-expressions': 'off',
    },
  },

  ...ftestConfig,
  ...webUiFtestConfig,
  ...a11yConfig,
  ...spreadsheetConfig,

  {
    files: ['**/test/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        assert: 'readonly',
        expect: 'readonly',
        sinon: 'readonly',
      },
    },
    rules: { 'no-unused-expressions': 'off' },
  },

  prettier,
];