import globals from 'globals';

export default [
  {
    files: ['addons/nuxeo-spreadsheet/app/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        $: 'readonly',
        Handsontable: 'readonly',
        WalkontableCellRange: 'readonly',
      },
    },
    rules: {
      'default-case': 'off',
      'guard-for-in': 'off',
      'no-case-declarations': 'off',
      'no-continue': 'off',
      'no-fallthrough': 'off',
      'no-restricted-syntax': 'off',
      'no-return-assign': 'off',
      'prefer-const': 'off',
      'prefer-destructuring': 'off',
      'prefer-rest-params': 'off',
      'vars-on-top': 'off',
    },
  },

  {
    files: ['addons/nuxeo-spreadsheet/webpack.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        sourceType: 'script',
      },
    },
  },
];
