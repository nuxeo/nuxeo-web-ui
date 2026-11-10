/*
 * Loaded into every WebdriverIO worker through `execArgv` (see `wdio.conf.js`), so it runs before
 * `@wdio/local-runner`'s entry point.
 *
 * A worker reports everything it does - "ready", test results, errors - to the launcher over the
 * `process.send` IPC channel. `@wdio/local-runner` calls `process.send` without a callback, so when
 * a write fails Node has nowhere to hand the error and emits an `'error'` event on `process`
 * instead. Nobody listens for it, which turns a lost channel into an unhandled-event crash: the
 * worker dies with a bare `Error: write EINVAL` stack through `node:internal/child_process`, the
 * launcher reports `FAILED` with no spec name and no reason, Ant reduces that to `exec returned: 1`
 * and Maven to "There was a timeout or other error in the fork". Whatever the worker was doing is
 * gone by the time anyone reads the log.
 *
 * Claiming the event costs nothing and makes that failure name itself. The worker still exits
 * non-zero - it cannot report a result over a channel that does not work, and staying alive would
 * only hang the launcher - but it exits saying what broke.
 */
process.on('error', (error) => {
  const code = error && error.code ? error.code : 'unknown';

  console.error(
    [
      '',
      '==========================================================================',
      'wdio worker: lost the IPC channel to the test launcher.',
      '',
      `  ${(error && error.stack) || error}`,
      `  code=${code} connected=${process.connected} pid=${process.pid}`,
      '',
      'This is NOT a test failure. The worker could not talk to the launcher, so the',
      'launcher will show its spec as FAILED with no test name - the real test result,',
      'if there was one, never made it out of this process.',
      '',
      'EINVAL or EBADF here means fd 3 is no longer the IPC socket: something between',
      'the launcher and node took that descriptor over. `xvfb-run` >= 2:21.1.22 does',
      'exactly that, which is why this suite sets `autoXvfb: false`.',
      '==========================================================================',
      '',
    ].join('\n'),
  );

  process.exit(1);
});
