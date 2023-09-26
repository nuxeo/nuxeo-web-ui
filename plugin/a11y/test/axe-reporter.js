// eslint-disable-next-line import/no-unresolved
import { source } from 'axe-core';

class AxeCore {
  async run() {
    await browser.execute(source);
    const options = {
      runOnly: {
        type: 'tag',
        values: ['ACT', 'best-practice', 'wcag2a', 'wcag2aa'],
      },
    };
    // run inside browser and get results
    const results = await browser.executeAsync((opts, done) => {
      // eslint-disable-next-line no-undef
      axe
        .run(opts)
        .then((res) => done(res))
        .catch((err) => {
          throw err;
        });
    }, options);
    return this.process(await results);
  }

  process(results) {
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
}
export async function runAxeCore() {
  return new AxeCore().run();
}
