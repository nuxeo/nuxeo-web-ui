export default class Login {
  async setusername(username) {
    const user = $('#username');
    await user.setValue(username);
  }

  async setpassword(password) {
    const passwd = $('#password');
    await passwd.setValue(password);
  }

  async submit() {
    const submitBtn = $("[name='Submit']");
    submitBtn.click();
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(baseUrl ? `${baseUrl}/logout` : 'logout');
    return new this();
  }
}
