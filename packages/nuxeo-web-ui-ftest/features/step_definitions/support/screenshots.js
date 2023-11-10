import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { After, Status } from '../../../node_modules/@cucumber/cucumber';

After(function(scenario) {
  const { status } = scenario.result;
  if (process.env.SCREENSHOTS_PATH && status === Status.FAILED) {
    mkdirp.sync(process.env.SCREENSHOTS_PATH);
    const filename = path.join(process.env.SCREENSHOTS_PATH, `${scenario.pickle.name} (${status}).png`);
    const screenshot = browser.saveScreenshot(filename);
    this.attach(screenshot, 'image/png');
  }
});
