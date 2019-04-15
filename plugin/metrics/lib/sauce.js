var chalk = require('chalk');
var cleankill = require('cleankill');
var sauceConnect = require('sauce-connect-launcher');
var uuid = require('uuid');

let config = {
  username:  process.env.SAUCE_USERNAME,
  accessKey: process.env.SAUCE_ACCESS_KEY,
  tunnelId:  process.env.SAUCE_TUNNEL_ID,
  port: 4444,
  buildNumber: process.env.TRAVIS_BUILD_NUMBER,
  jobName: process.env.TRAVIS_REPO_SLUG,
  visibility: 'public'
};

let activeTunnel;

module.exports.connect = (options) => new Promise((resolve, reject) => {
  if (!config.username || !config.accessKey) {
    reject('Missing Sauce credentials. Did you forget to set SAUCE_USERNAME and/or SAUCE_ACCESS_KEY?');
  }

  var connectOptions = {
    username:         config.username,
    accessKey:        config.accessKey,
    tunnelIdentifier: uuid.v4(),
    logger: (m) => console.log(m),
    port:             config.port,
    verbose: true
  };

  var tunnelId = connectOptions.tunnelIdentifier;

  console.log('Creating Sauce Connect tunnel');

  sauceConnect(connectOptions, (error, tunnel) => {
    if (error) {
      reject('Sauce tunnel failed:');
    } else {

      activeTunnel = tunnel;

      Object.keys(options).forEach((browser) => {
        Object.assign(options[browser].desiredCapabilities, {
            accessKey: config.accessKey,
            username:  config.username,
            tunnelIdentifier: tunnelId
          });
      });

      console.log(options);

      console.log('Sauce tunnel active:', chalk.yellow(tunnelId));
      console.log('sauce:tunnel-active', tunnelId);
    }
    resolve(tunnelId);
  });
  // SauceConnectLauncher only supports one tunnel at a time; this allows us
  // to kill it before we've gotten our callback.
  cleankill.onInterrupt(() => {
    sauceConnect.kill();
    return resolve();
  });
});

module.exports.close = () => activeTunnel && activeTunnel.close();