/**
 * Ensures `globalThis.Nuxeo` (or `window.Nuxeo`) exists as an object before loading code that
 * attaches to it at evaluation time.
 *
 * Why: `elements/performance.js` assigns `Nuxeo.Performance` when the module runs. In the test
 * runner there is no full Web UI bootstrap, so `Nuxeo` may be undefined and the import throws.
 *
 * Usage: import this file immediately before importing `../elements/performance.js` (see
 * `test/nuxeo-performance.test.js`). Not used by the general coverage bulk-import path.
 */
const _g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
if (_g && !_g.Nuxeo) {
  _g.Nuxeo = {};
}
