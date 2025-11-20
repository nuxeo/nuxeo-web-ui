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

  static get() {
    return (async () => {
      const baseUrl = process.env.NUXEO_URL || '';
      await driver.pause(1000);
      const loginUrl = baseUrl ? `${baseUrl}/logout` : 'logout';

      await browser.url(loginUrl);
      await driver.pause(4000);

      // wait for login form to appear
      await $('#username').waitForDisplayed({ timeout: 15000 });

      return new this();
    })();
  }
}
