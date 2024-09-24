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
      const baseUrl = (await process.env.NUXEO_URL) || '';
      /* eslint-disable no-console */
      console.log(baseUrl);
      await driver.pause(1000);
      await browser.url((await baseUrl) ? `${baseUrl}/logout` : 'logout');
      return new this();
    })();
  }
}
