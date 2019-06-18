exports.config = {
    services: ['selenium-standalone'],
    chrome: {
        desiredCapabilities: {
            browserName: 'chrome',
        }
    },
    firefox: {
        desiredCapabilities: {
            browserName: 'firefox',
        }
    },
    safari: {
      desiredCapabilities: {
          browserName: 'safari',
      }
    },
};
