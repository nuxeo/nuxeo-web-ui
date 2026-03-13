import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import htmlPlugin from 'eslint-plugin-html';
import prettierConfig from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Resolve eslint-config-airbnb-base from @open-wc/eslint-config's own dependencies
// (it may be nested there rather than hoisted to the project root)
const openWcRequire = createRequire(
  path.join(__dirname, 'node_modules/@open-wc/eslint-config/index.js'),
);
const airbnbBasePath = openWcRequire.resolve('eslint-config-airbnb-base');

/**
 * Apply additional ignores to each FlatCompat-converted config.
 * Also strips out null entries from `files` arrays that FlatCompat sometimes produces.
 */
function withIgnores(configs, ignorePatterns) {
  return configs.map((config) => {
    const files = config.files?.filter(Boolean);
    const entry = {
      ...config,
      ignores: [...(config.ignores || []), ...ignorePatterns],
    };
    if (files !== undefined) {
      if (files.length === 0) {
        // null-only `files` array — promote to a global config (no `files` key)
        const { files: _files, ...rest } = entry;
        return rest;
      }
      entry.files = files;
    }
    return entry;
  });
}

export default [
  // ── Global ignores (replaces .eslintignore) ──────────────────────────────
  {
    ignores: [
      'metrics/',
      'node_modules/',
      'coverage/',
      'target/',
      'dist/',
      '.tmp/',
      'index.html',
      'vendor/',
      'addons/nuxeo-platform-3d/controls/',
      'addons/nuxeo-platform-3d/loaders/',
    ],
  },

  // ── @open-wc/eslint-config (all files except ftest/) ─────────────────────
  ...withIgnores(compat.extends('@open-wc/eslint-config'), ['ftest/**']),

  // ── Prettier: disable rules that conflict with prettier formatting ─────────
  {
    ignores: ['ftest/**'],
    ...prettierConfig,
  },

  // ── Main project rules ────────────────────────────────────────────────────
  {
    files: ['**/*.js', '**/*.html'],
    ignores: ['ftest/**'],
    plugins: { html: htmlPlugin },
    languageOptions: {
      globals: {
        Nuxeo: 'writable',
        jQuery: 'readonly',
        THREE: 'readonly',
      },
    },
    settings: {
      'html/indent': '+2',
      'html/report-bad-indent': 'error',
    },
    rules: {
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
          // ignore long html attributes and imports
          ignorePattern: `(^[ \\t]*\\w+\\$?='[^']+'$|^[ \\t]*\\w+\\$?="[^"]+"$|^import[^;]+;$)`,
        },
      ],
      'no-alert': 'off',
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-multi-assign': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-sequences': 'off',
      'no-underscore-dangle': 'off',
      'padded-blocks': 'off',
    },
  },

  // ── HTML-specific globals ────────────────────────────────────────────────
  {
    files: ['**/*.html'],
    ignores: ['ftest/**'],
    languageOptions: {
      globals: {
        Polymer: 'readonly',
      },
    },
  },

  // ── scripts/**/*.js ───────────────────────────────────────────────────────
  {
    files: ['scripts/**/*.js'],
    rules: {
      'import/no-dynamic-require': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'global-require': 'off',
      'no-console': 'off',
    },
  },

  // ── addons ftest step definitions ─────────────────────────────────────────
  {
    files: ['addons/**/ftest/features/step_definitions/**/*.js'],
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-unused-expressions': 'off',
    },
  },

  // ── Unit test files ────────────────────────────────────────────────────────
  {
    files: ['**/test/**/*.test.js'],
    languageOptions: {
      globals: {
        assert: 'readable',
        expect: 'readable',
        sinon: 'readable',
      },
    },
    rules: {
      'no-unused-expressions': 'off',
    },
  },

  // ── packages/nuxeo-web-ui-ftest globals (from packages/nuxeo-web-ui-ftest/.eslintrc) ──
  {
    files: ['packages/nuxeo-web-ui-ftest/**/*.js'],
    languageOptions: {
      globals: {
        $: 'readonly',
        addedVocabularyEntries: 'readonly',
        addedComments: 'readonly',
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
      'no-unused-expressions': 'off',
    },
  },

  // ── plugin/a11y globals (from plugin/a11y/.eslintrc) ─────────────────────
  {
    files: ['plugin/a11y/**/*.{js,html}'],
    languageOptions: {
      globals: {
        $: 'readonly',
        browser: 'readonly',
        expect: 'readonly',
      },
    },
  },

  // ── addons/nuxeo-spreadsheet/app (from addons/nuxeo-spreadsheet/app/.eslintrc) ──
  {
    files: ['addons/nuxeo-spreadsheet/app/**/*.js'],
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
    languageOptions: {
      globals: {
        $: 'readonly',
        Handsontable: 'readonly',
        WalkontableCellRange: 'readonly',
      },
    },
  },

  // ── ftest/ ── airbnb-base rules (replicates ftest/.eslintrc "root: true" behaviour) ──
  ...withIgnores(
    compat.extends(airbnbBasePath),
    // Remove the global ignores so ftest files are now matched
    [],
  ).map((config) => {
    return { ...config, files: ['ftest/**/*.js'] };
  }),
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
