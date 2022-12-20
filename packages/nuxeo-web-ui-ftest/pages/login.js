export default class Login {
  set username(username) {
    $('#username').waitForDisplayed();
    $('#username').setValue(username);
  }

  set password(password) {
    $('#password').waitForDisplayed();
    $('#password').setValue(password);
  }

  submitUP() {
    $('[name="Submit"]').waitForDisplayed();
    return $('[name="Submit"]').click();
  }

  async setusername(username) {
    const user = $('#username');
    await (await user).setValue(username);
  }

  async setpassword(password) {
    const passwd = $('#password');
    await (await passwd).setValue(password);
  }

  async submit() {
    const submitBtn = $("[name='Submit']");
    await (await submitBtn).click();
    submitBtn.click();
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
