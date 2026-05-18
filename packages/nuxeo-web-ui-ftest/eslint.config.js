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
    files: ['**/*.js'],
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
        Nuxeo: 'writable',
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
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_$' }],
      'no-setter-return': 'off',
      'no-constant-binary-expression': 'off',
      'no-useless-assignment': 'off',
    },
  },

  {
    files: ['features/step_definitions/*.js'],
    rules: {
      'no-unused-expressions': 'off',
    },
  },

  {
    files: ['features/step_definitions/support/fixtures/localstorage.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },

  {
    files: ['pages/ui.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },

  prettier,
];
