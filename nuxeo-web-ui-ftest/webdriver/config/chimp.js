module.exports = {
  // - - - - CHIMP - - - -
  showXolvioMessages: false,
  // - - - - CUCUMBER - - - -
  path: 'test/features',
  chai: true,
  // - - - - WEBDRIVER-IO  - - - -
  webdriverio: {
    baseUrl: process.env.NUXEO_URL ? 'http://localhost:5000' : 'http://localhost:8080/nuxeo',
    waitforTimeout: 3000,
    waitforInterval: 250,
  },
};
