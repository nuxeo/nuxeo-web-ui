export default class Login {
  async setUsername(username) {
    await $('#username').waitForDisplayed();
    await $('#username').setValue(username);
  }
  
  async setPassword(password) {
    await $('#password').waitForDisplayed();
    await $('#password').setValue(password);
  }

  async submit() {
    await $('[name="Submit"]').waitForDisplayed();
    $('[name="Submit"]').click();
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
