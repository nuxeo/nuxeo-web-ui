import globals from 'globals';

export default [
  {
    files: ['plugin/a11y/test/**/*.js', 'plugin/a11y/test/specs/**/*.js', 'plugin/a11y/test/**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        browser: 'readonly',
        context: 'readonly',
      },
    },
  },

  {
    files: ['plugin/a11y/wdio.conf.js', 'plugin/a11y/getDriverVersion.js'],
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
];
