import globals from 'globals';

export default [
  {
    files: ['packages/nuxeo-web-ui-ftest/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,

        // legacy ftest globals
        $: 'writable',
        addedComments: 'writable',
        addedVocabularyEntries: 'writable',
        driver: 'readonly',
        fixtures: 'readonly',
        liveCollections: 'readonly',
        liveDocuments: 'readonly',
        runningWorkflows: 'readonly',
        users: 'readonly',
        groups: 'readonly',
        browser: 'readonly',
        moment: 'readonly',
        assert: 'readonly',
        expect: 'readonly',
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
    },
  },

  {
    files: ['packages/nuxeo-web-ui-ftest/features/step_definitions/*.js'],
    rules: {
      'no-unused-expressions': 'off',
    },
  },

  {
    files: ['packages/nuxeo-web-ui-ftest/features/step_definitions/support/fixtures/localstorage.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },

  {
    files: ['packages/nuxeo-web-ui-ftest/pages/ui.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },
];
