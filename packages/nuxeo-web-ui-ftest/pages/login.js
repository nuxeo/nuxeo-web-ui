export default class Login {
  set username(username) {
    driver.waitForVisible('#username');
    driver.element('#username').setValue(username);
  }

  set password(password) {
    driver.waitForVisible('#password');
    driver.element('#password').setValue(password);
  }

  submit() {
    driver.waitForVisible('[name="Submit"]');
    return driver.click('[name="Submit"]');
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
