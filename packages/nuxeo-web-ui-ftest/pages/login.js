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
    await submitButton.click();
  }

  static async get() {
    const baseUrl = process.env.NUXEO_URL || '';
    const loginUrl = baseUrl ? `${baseUrl}/logout` : 'logout';

    await browser.url(loginUrl);

    const logs = await browser.getLogs('browser');

    // Wait until browser is idle and page is ready
    await browser.waitUntil(
      async () => {
        const ready = await browser.execute(() => document.readyState);
        return ready === 'complete';
      },
      { timeout: 20000, timeoutMsg: 'Page did not reach readyState complete' },
    );

    // wait for login form to appear
    try {
      await $('#username').waitForDisplayed({ timeout: 30000 });
    } catch (e) {
      await browser.saveScreenshot('./error_login.png');
      console.log('🛑 Screenshot taken for login failure');
      throw e;
    }

    return new this();
  }
}
