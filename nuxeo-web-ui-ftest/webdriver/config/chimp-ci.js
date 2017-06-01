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
    baseUrl: 'http://localhost:8080/nuxeo/',
    waitforTimeout: 5000,
    waitforInterval: 250,
  },
  desiredCapabilities: {
    browserName : "chrome",
    javascriptEnabled : true,
    acceptSslCerts : true,
    chromeOptions : {
      args : ["--no-sandbox"]
    }
  }

};
