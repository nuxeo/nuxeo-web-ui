module.exports = {
  extends: ['@open-wc/eslint-config', 'eslint-config-prettier'].map(require.resolve),
  plugins: ['html'],
  env: {
    browser: true,
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
        // ignore long html atributes and imports
        ignorePattern: '(^[ \\t]*\\w+\\$?=\\\'[^\']+\\\'$|^[ \\t]*\\w+\\$?=\\"[^"]+\\"$|^import[^;]+;$)',
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
  globals: {
    Nuxeo: 'writable',
    jQuery: 'readonly',
    THREE: 'readonly',
  },
  settings: {
    'html/indent': '+2',
    'html/report-bad-indent': 'error',
  },
  overrides: [
    {
      files: ['*.html'],
      globals: {
        Polymer: 'readonly',
      },
    },
    {
      files: ['scripts/**/*.js'],
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
    {
      files: ['**/test/**/*.test.js'],
      env: {
        mocha: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
      globals: {
        assert: 'readable',
        expect: 'readable',
        sinon: 'readable',
      },
    },
  ],
};
