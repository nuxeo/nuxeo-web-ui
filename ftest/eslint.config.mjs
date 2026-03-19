import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,

        // legacy ftest globals
        $: 'writable',
        addedComments: 'writable',
        driver: 'readonly',
        fixtures: 'readonly',
        liveCollections: 'readonly',
        liveDocuments: 'readonly',
        runningWorkflows: 'readonly',
        users: 'readonly',
        groups: 'readonly',
        browser: 'readonly',
      },
    },
    rules: {
      'new-cap': [
        'error',
        {
          capIsNewExceptions: ['Given', 'When', 'Then', 'After', 'Before'],
        },
      ],
      'no-unused-expressions': 'off',
      'no-else-return': 'off',
      'no-return-assign': 'off',
      'no-throw-literal': 'off',
      'no-underscore-dangle': 'off',
      'prefer-destructuring': 'off',
      radix: 'off',
    },
  },
];
