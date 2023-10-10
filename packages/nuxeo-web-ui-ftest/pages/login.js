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
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
