import { runAxeCore } from './axe-reporter.js';

export function reportA11y(expectedViolations, expectedIncompleteViolations, setup) {
  let _report;

  const getReport = () => {
    if (_report) {
      return _report;
    }
    browser.setTimeout({ script: 240000 });

    setup();

    browser.pause(3000);
    _report = runAxeCore();

    return _report;
  };

  context('Violations', () => {
    let report;

    before(() => {
      report = getReport();
    });

    Object.entries(expectedViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, () => {
        expect(report.violations).toEqual(
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

    before(() => {
      report = getReport();
    });

    Object.entries(expectedIncompleteViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, () => {
        expect(report.incomplete).toEqual(
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
