import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const compat = new FlatCompat({ baseDirectory: rootDir });

// Resolve eslint-config-airbnb-base from @open-wc/eslint-config's own dependencies
// (it may be nested there rather than hoisted to the project root)
const openWcRequire = createRequire(
  path.join(rootDir, 'node_modules/@open-wc/eslint-config/index.js'),
);
const airbnbBasePath = openWcRequire.resolve('eslint-config-airbnb-base');

// ── ftest/ ── airbnb-base rules (replicates ftest/.eslintrc "root: true" behaviour) ──
export default [
  ...compat.extends(airbnbBasePath).map((config) => ({
    ...config,
    files: ['ftest/**/*.js'],
  })),
  {
    files: ['ftest/**/*.js'],
    rules: {
      'class-methods-use-this': 'off',
      'comma-dangle': ['error', 'always-multiline'],
      'consistent-return': 'off',
      'func-names': 'off',
      'max-len': [
        'error',
        120,
        2,
        {
          ignoreUrls: true,
          ignoreComments: false,
        },
      ],
      'new-cap': [
        'error',
        {
          capIsNewExceptions: ['Given', 'When', 'Then', 'After', 'Before'],
        },
      ],
      'no-unused-expressions': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-else-return': 'off',
      'no-return-assign': 'off',
      'no-throw-literal': 'off',
      'no-underscore-dangle': 'off',
      'prefer-destructuring': 'off',
      radix: 'off',
    },
    languageOptions: {
      globals: {
        addedComments: 'readonly',
        driver: 'readonly',
        fixtures: 'readonly',
        liveCollections: 'readonly',
        liveDocuments: 'readonly',
        runningWorkflows: 'readonly',
        users: 'readonly',
        groups: 'readonly',
        browser: 'readonly',
        $: 'readonly',
      },
    },
  },
];
