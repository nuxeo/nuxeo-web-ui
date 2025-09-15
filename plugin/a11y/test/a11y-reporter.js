/* eslint-disable no-console */
import { runAxeCore } from './axe-reporter.js';

export function reportA11y(expectedViolations, expectedIncompleteViolations, setup) {
  let _report;
  const getReport = async () => {
    if (_report) {
      return _report;
    }
    await setup();
    await browser.setTimeout({ script: 240000 });
    await browser.pause(3000);
    _report = await runAxeCore();
    return _report;
  };

  context('Violations', () => {
    let report;

    before(async () => {
      report = await getReport();

      console.log('------------------------------------');
      console.log('Received Violations:');
      report.violations.forEach((v) => {
        console.log(`${v.id}: ${v.issues}`);
      });
      console.log('------------------------------------');
    });

    Object.entries(expectedViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, async () => {
        const found = report.violations.find((v) => v.id === violation);
        await expect(!found || found.issues <= issues).toBe(true);
      });
    });
  });

  context('Incomplete violations', () => {
    let report;

    before(async () => {
      report = await getReport();
      console.log('------------------------------------');
      console.log('Received Incomplete Violations:');
      report.incomplete.forEach((v) => {
        console.log(`${v.id}: ${v.issues}`);
      });
      console.log('------------------------------------');
    });

    Object.entries(expectedIncompleteViolations).forEach(([violation, issues]) => {
      it(`${violation}: ${issues} issue(s)`, async () => {
        const found = report.incomplete.find((v) => v.id === violation);
        await expect(!found || found.issues <= issues).toBe(true);
      });
    });
  });
}
