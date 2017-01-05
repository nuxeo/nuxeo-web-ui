module.exports = {
  // - - - - CHIMP - - - -
  showXolvioMessages: false,
  // - - - - CUCUMBER - - - -
  path: 'test/features',
  chai: true,
  screenshotsOnError: true,
  screenshotsPath: 'target/screenshots',
  saveScreenshotsToDisk: true,
  jsonOutput: 'target/cucumber-reports/report.json',
  // - - - - WEBDRIVER-IO  - - - -
  webdriverio: {
    baseUrl: 'http://localhost:8080/nuxeo',
    waitforTimeout: 2000,
    waitforInterval: 250,
  },
};
