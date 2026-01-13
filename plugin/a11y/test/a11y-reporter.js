/* eslint-disable no-console */
import { runAxeCore } from './axe-reporter.js';

function formatLine(id, count, threshold) {
  const passed = count <= threshold;
  const symbol = passed ? '✓' : '✗';

  return {
    passed,
    line: `${symbol} ${id.padEnd(30)} ${count} / ${threshold}`,
  };
}

function logAndCollectFailures(title, actualList, expectedMap) {
  console.log('------------------------------------');
  console.log(title);
  console.log('------------------------------------');

  const actualById = Object.fromEntries(actualList.map((v) => [v.id, v.issues]));

  const failures = [];

  Object.entries(expectedMap).forEach(([id, threshold]) => {
    const count = actualById[id] ?? 0;
    const { passed, line } = formatLine(id, count, threshold);

    console.log(line);

    if (!passed) {
      failures.push(`${id} (${count} > ${threshold})`);
    }
  });

  if (failures.length) {
    console.log('\nFAILED RULES:');
    failures.forEach((f) => console.log(`- ${f}`));
  }

  console.log('------------------------------------');

  return failures;
}

export function reportA11y(expectedViolations, expectedIncompleteViolations, setup) {
  let reportPromise;

  const getReport = async () => {
    if (!reportPromise) {
      reportPromise = (async () => {
        await setup();
        await browser.setTimeout({ script: 240000 });
        await browser.pause(3000);
        return runAxeCore();
      })();
    }
    return reportPromise;
  };

  context('Accessibility Violations', () => {
    let failures = [];

    before(async () => {
      const report = await getReport();
      failures = logAndCollectFailures('Received Violations', report.violations, expectedViolations);
    });

    it('meets accessibility violation thresholds', () => {
      if (failures.length) {
        throw new Error(`Accessibility violations exceeded thresholds:\n${failures.join('\n')}`);
      }
    });
  });

  context('Accessibility Incomplete Violations', () => {
    let failures = [];

    before(async () => {
      const report = await getReport();
      failures = logAndCollectFailures(
        'Received Incomplete violations',
        report.incomplete,
        expectedIncompleteViolations,
      );
    });

    it('meets accessibility incomplete thresholds', () => {
      if (failures.length) {
        throw new Error(`Accessibility incomplete violations exceeded thresholds:\n${failures.join('\n')}`);
      }
    });
  });
}
