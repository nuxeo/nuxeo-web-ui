import globals from 'globals';

export default [
  {
    files: ['test/**/*.js', 'test/specs/**/*.js', 'test/**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        browser: 'readonly',
        context: 'readonly',
      },
    },
  },

  {
    files: ['wdio.conf.js', 'getDriverVersion.js'],
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
