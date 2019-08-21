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
    const nuxeoUrl = process.env.NUXEO_URL || '';
    driver.url(nuxeoUrl ? `${nuxeoUrl}/logout` : 'logout');
    // XXX - force redirect after logout
    driver.url(nuxeoUrl ? `${nuxeoUrl}/login.jsp` : 'login.jsp');
    return new this();
  }
}
