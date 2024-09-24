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
    const waitForPageLoad = () => {
      browser.waitUntil(() => browser.execute(() => document.readyState === 'complete'), {
        timeout: 60 * 1000, // 60 seconds
        timeoutMsg: 'Message on failure',
      });
    };

    return (async () => {
      const baseUrl = process.env.NUXEO_URL || '';
      await browser.url(baseUrl ? `${baseUrl}/logout` : 'logout');
      await browser.getTitle();
      waitForPageLoad();
      return new this();
    })();
  }
}
