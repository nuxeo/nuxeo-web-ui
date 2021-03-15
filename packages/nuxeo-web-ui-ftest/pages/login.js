export default class Login {
  set username(username) {
    driver.waitForVisible('#username');
    driver.element('#username').setValue(username);
    // $('#username').waitForDisplayed();
    // $('#username').setValue(username);
  }

  set password(password) {
    $('#password').waitForDisplayed();
    $('#password').setValue(password);
  }

  submit() {
    $('[name="Submit"]').waitForDisplayed();
    return $('[name="Submit"]').click();
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
