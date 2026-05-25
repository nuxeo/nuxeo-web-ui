/**
 * Sets a browser flag so test/setup.js runs coverage materialization under native V8 coverage.
 * Istanbul (legacy Karma) used window.__coverage__; WTR native instrumentation does not.
 */
export function nuxeoCoverageFlagPlugin(enabled) {
  if (!enabled) {
    return { name: 'nuxeo-coverage-flag-disabled' };
  }

  return {
    name: 'nuxeo-coverage-flag',
    transformImport({ context }) {
      const pathname = context.path.split('?')[0];
      if (!pathname.endsWith('/test/setup.js')) {
        return undefined;
      }
      return {
        transform(source) {
          return `globalThis.__NUXEO_COVERAGE_RUN__ = true;\n${source}`;
        },
      };
    },
  };
}
