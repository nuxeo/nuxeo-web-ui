import { runAxeCore } from './axe-reporter.js';

export function reportA11y(expectedViolations, expectedIncompleteViolations, setup) {
  let _report;
  const getReport = async () => {
    if (_report) {
      return _report;
    }
    setup();
    await browser.setTimeout({ script: 240000 });
    await browser.pause(3000);
    _report = await runAxeCore();
    return _report;
  };

  context('Violations', () => {
    let report;

    before(async () => {
      report = await getReport();
    });

    Object.entries(expectedViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, async () => {
        await expect(report.violations).toEqual(
          expect.arrayContaining([
            {
              id: violation,
              issues,
            },
          ]),
        );
      });
    });
  });

  context('Incomplete violations', () => {
    let report;

    before(async () => {
      report = await getReport();
    });

    Object.entries(expectedIncompleteViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, async () => {
        await expect(report.incomplete).toEqual(
          expect.arrayContaining([
            {
              id: violation,
              issues,
            },
          ]),
        );
      });
    });
  });
}
