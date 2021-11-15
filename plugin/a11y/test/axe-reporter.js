// eslint-disable-next-line import/no-unresolved
import { source } from 'axe-core';

export function runAxeCore() {
  // inject the axe-core lib
  browser.execute(source);

  // https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
  const options = {
    runOnly: {
      type: 'tag',
      values: ['ACT', 'best-practice', 'wcag2a', 'wcag2aa'],
    },
  };
  // run inside browser and get results
  const results = browser.executeAsync((opts, done) => {
    // eslint-disable-next-line no-undef
    axe
      .run(opts)
      .then((res) => done(res))
      .catch((err) => {
        throw err;
      });
  }, options);

  return {
    results,
    incomplete: results.incomplete.map((a) => {
      return { id: a.id, issues: a.nodes.length };
    }),
    violations: results.violations.map((a) => {
      return { id: a.id, issues: a.nodes.length };
    }),
  };
}
