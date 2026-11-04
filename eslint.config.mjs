import js from '@eslint/js';
import html from 'eslint-plugin-html';
import importPlugin from 'eslint-plugin-import-x';
import { configs as wcConfigs } from 'eslint-plugin-wc';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

import ftestConfig from './ftest/eslint-rules.mjs';
import spreadsheetConfig from './addons/nuxeo-spreadsheet/eslint-rules.mjs';

// Syntax that polymer-analyzer 3.2.4 (babylon 7.0.0-beta.47) cannot parse. The Designer catalog generator
// (packages/nuxeo-designer-catalog) runs it on the Web UI sources: a file using any of this fails to parse
// and is dropped, together with the elements it defines and the ones only reachable through it
// (WEBUI-1922, WEBUI-2418). Use explicit guards instead, e.g. `a && a.b`, `a != null ? a.b : undefined`,
// an explicit `!= null` check for `??`, or `catch (e)`.
// Keep in sync with the same list in nuxeo-elements' eslint.config.mjs.
const polymerAnalyzerUnsupportedSyntax = [
  {
    selector: 'ChainExpression',
    message: 'Optional chaining (?.) is not supported by polymer-analyzer. Use explicit && guards.',
  },
  {
    selector: "LogicalExpression[operator='??']",
    message: 'Nullish coalescing (??) is not supported by polymer-analyzer. Use an explicit null/undefined check.',
  },
  {
    selector: 'CatchClause[param=null]',
    message: 'Optional catch binding is not supported by polymer-analyzer. Use catch (e).',
  },
  {
    selector: 'AssignmentExpression[operator=/^(\\|\\||&&|\\?\\?)=$/]',
    message: 'Logical assignment (||=, &&=, ??=) is not supported by polymer-analyzer.',
  },
  { selector: 'PropertyDefinition', message: 'Class fields are not supported by polymer-analyzer.' },
  { selector: 'StaticBlock', message: 'Class static blocks are not supported by polymer-analyzer.' },
  { selector: 'PrivateIdentifier', message: 'Private #members are not supported by polymer-analyzer.' },
  { selector: 'Literal[bigint]', message: 'BigInt literals are not supported by polymer-analyzer.' },
  {
    selector: 'Literal[raw=/^[0-9][0-9a-fA-FxXoObB.]*_[0-9a-fA-F_.]*$/]',
    message: 'Numeric separators are not supported by polymer-analyzer.',
  },
  { selector: 'ExportAllDeclaration[exported]', message: '`export * as ns` is not supported by polymer-analyzer.' },
  {
    selector: 'ImportDeclaration[attributes.length>0]',
    message: 'Import attributes are not supported by polymer-analyzer.',
  },
  {
    selector: 'ExportNamedDeclaration[attributes.length>0]',
    message: 'Export attributes are not supported by polymer-analyzer.',
  },
  {
    selector: 'Program > ExpressionStatement > AwaitExpression',
    message: 'Top-level await is not supported by polymer-analyzer.',
  },
  {
    selector: 'Program > VariableDeclaration > VariableDeclarator > AwaitExpression',
    message: 'Top-level await is not supported by polymer-analyzer.',
  },
  { selector: 'Literal[regex.flags=/[dv]/]', message: 'Regex d/v flags are not supported by polymer-analyzer.' },
];

export default [
  {
    ignores: [
      '**/metrics/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/target/**',
      '**/dist/**',
      '**/.tmp/**',
      '**/.agents/skills/**',
      '**/.claude/skills/**',
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
      'import-x': importPlugin,
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
      'web-test-runner.config.mjs',
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

  // Runs in the WebdriverIO worker process before the test runner starts, so it is plain Node
  // rather than app code. Matched explicitly: the rest of plugin/a11y/test is specs.
  {
    files: ['plugin/a11y/test/wdio-worker-bootstrap.js'],
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
    files: ['scripts/**/*.{js,mjs}', '.github/scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
    rules: {
      'import-x/no-dynamic-require': 'off',
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'global-require': 'off',
      'no-console': 'off',
    },
  },

  // Cursor Agent Skill helpers: plain CommonJS run by Node outside the app bundle.
  {
    files: ['.cursor/skills/**/scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['addons/**/ftest/features/step_definitions/**/*.js'],
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-unused-expressions': 'off',
    },
  },

  ...ftestConfig,
  ...spreadsheetConfig,

  // Source read by the Designer catalog generator. Kept after the addon configs so they cannot switch it off.
  {
    files: ['elements/**/*.{js,html}', 'themes/**/*.js', 'index.js'],
    rules: {
      'no-restricted-syntax': ['error', ...polymerAnalyzerUnsupportedSyntax],
    },
  },

  {
    files: ['**/test/**/*.test.js', '**/test/setup.js'],
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
