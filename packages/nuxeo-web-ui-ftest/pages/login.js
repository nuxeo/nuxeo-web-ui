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
      await browser.url(baseUrl ? `${baseUrl}/logout` : 'logout');

      // wait until login form is visible
      const usernameInput = await $('#username');
      await usernameInput.waitForDisplayed({ timeout: 15000 }); // up to 15s

      return new this();
    })();
  }
}
