import { join } from 'path';
import { sync } from 'mkdirp';
import { writeFileSync } from 'fs';
import { After } from 'cucumber';

export const setupLogger = () =>
  browser.execute(() => {
    /* eslint-disable no-console */
    console._log = console.log.bind(console);
    console._warn = console.warn.bind(console);
    console._error = console.error.bind(console);
    window.ftestLogs = [];
    console.history = [];
    window.addEventListener('unhandledrejection', (e) => {
      window.ftestLogs.push({ type: 'unhandledrejection', value: [e] });
    });
    window.onerror = (...args) => {
      window.ftestLogs.push({ type: 'onerror', value: [...args] });
    };
    console.log = (...args) => {
      window.ftestLogs.push({ type: 'console.log', value: [...args] });
      console._log.call(console, ...args);
    };
    console.warn = (...args) => {
      window.ftestLogs.push({ type: 'console.warn', value: [...args] });
      console._warn.call(console, ...args);
    };
    console.error = (...args) => {
      window.ftestLogs.push({ type: 'console.error', value: [...args] });
      console._error.call(console, ...args);
    };
    /* eslint-enable no-console */
  });

export const collectLogs = () => {
  const log = browser.execute(() => window.ftestLogs);
  return log && log.value;
};

After((scenario) => {
  const { status } = scenario.result;
  if (status === 'failed') {
    let logs = collectLogs();
    if (!logs || !Array.isArray(logs)) {
      return;
    }
    logs = collectLogs()
      .map((l) => `[${l.type}] ${l.value}`)
      .join('\n');
    sync(process.env.BROWSER_LOGS_PATH);
    const filename = join(process.env.BROWSER_LOGS_PATH, `${scenario.pickle.name} (${status}).log`);
    writeFileSync(filename, logs);
  }
});
