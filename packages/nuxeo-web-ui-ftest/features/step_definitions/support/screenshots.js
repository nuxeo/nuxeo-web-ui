import { After } from 'cucumber';

import * as path from 'path';
import * as mkdirp from 'mkdirp';

After(function(scenario) {
  const { status } = scenario.result;
  if (process.env.SCREENSHOTS_PATH && (status === 'failed')) {
    mkdirp.sync(process.env.SCREENSHOTS_PATH);
    const filename = path.join(process.env.SCREENSHOTS_PATH, `${scenario.pickle.name} (${status}).png`);
    const screenshot = browser.saveScreenshot(filename);
    this.attach(screenshot, 'image/png');
  }
});
