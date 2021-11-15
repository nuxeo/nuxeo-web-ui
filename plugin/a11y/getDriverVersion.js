const { execSync } = require('child_process');
const chromeLauncher = require('chrome-launcher');
const fetch = require('node-fetch');

const chromePath = chromeLauncher.Launcher.getFirstInstallation();
let version;
try {
  version = execSync(`"${chromePath}" --version`)
    .toString()
    .trim();
} catch (e) {
  console.error('unable to get Chrome version: ', e);
}
const match = version && version.match(/([0-9]+)\./);
if (match) {
  const checkVersion = match[1];
  try {
    fetch(`https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${checkVersion}`).then((response) => {
      if (response.ok) {
        return response
          .text()
          .then((newDriverVersion) => {
            // eslint-disable-next-line no-console
            console.log(newDriverVersion);
          })
          .catch((e) => {
            console.error('unable to parse ChromeDriver version: ', e);
          });
      }
      console.error('unable to fetch ChromeDriver version: ', response);
    });
  } catch (e) {
    console.error('unable to fetch ChromeDriver version: ', e);
  }
}
