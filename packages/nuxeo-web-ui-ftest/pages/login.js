export default class Login {
  async username(username) {
    const inputUserName = await $('#username');
    await inputUserName.setValue(username);
  }

  async password(password) {
    const inputPassword = await $('#password');
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
      await browser.url(baseUrl ? `${baseUrl}/logout` : 'logout');
      await driver.pause(4000);
      return new this();
    })();
  }
}
