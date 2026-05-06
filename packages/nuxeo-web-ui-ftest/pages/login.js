export default class Login {
  async username(username) {
    const inputUserName = await $('#username');
    await inputUserName.waitForDisplayed({ timeout: 10000 });
    await inputUserName.setValue(username);
  }

  async password(password) {
    const inputPassword = await $('#password');
    await inputPassword.waitForDisplayed({ timeout: 10000 });
    await inputPassword.setValue(password);
  }

  async submit() {
    const submitButton = await $('[name="Submit"]');
    await submitButton.waitForClickable({ timeout: 10000 });
    await submitButton.click();
  }

  static async get() {
    const baseUrl = process.env.NUXEO_URL || '';
    const loginUrl = baseUrl ? `${baseUrl}/logout` : 'logout';
    await browser.url(loginUrl);

    // Wait until browser is idle and page is ready
    await browser.waitUntil(async () => !(await browser.$$('nuxeo-app')).length, {
      timeout: 10000,
      interval: 200,
      timeoutMsg: 'nuxeo-app did not unload after logout',
    });

    // wait for login form to appear
    await $('#username').waitForDisplayed({ timeout: 30000 });

    return new this();
  }
}
