const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports = function screenshotHook() {
  const screenshots = {};

  /**
   * Capture screenshots a step fails
   */
  this.StepResult((stepResult) => { // eslint-disable-line new-cap
    const lastStep = stepResult.getStep();
    if (stepResult.getStatus() === 'failed' && process.env.SCREENSHOTS_PATH) {
      mkdirp.sync(process.env.SCREENSHOTS_PATH);
      const screenshotId = `${lastStep.getUri()}:${lastStep.getLine()}`;
      const fileName = path.join(process.env.SCREENSHOTS_PATH,
                                 `${lastStep.getKeyword()} ${lastStep.getName()} (${stepResult.getStatus()}).png`);
      return browser.saveScreenshot().then((screenshot) => {
        const stream = fs.createWriteStream(fileName);
        stream.write(screenshot);
        stream.end();
        screenshots[screenshotId] = screenshot;
      });
    }
  });

  /**
   * Attaches screenshots to the report
   */
  this.After((scenario) => {
    Object.keys(screenshots).forEach((key) => {
      const decodedImage = new Buffer(screenshots[key], 'base64');
      scenario.attach(decodedImage, 'image/png');
    });
  });
};
