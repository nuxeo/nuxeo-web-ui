class LoginPage {
  get inputUsername() {
    return $('#username');
  }

  get inputPassword() {
    return $('#password');
  }

  get btnSubmit() {
    return $('input[name="Submit"]');
  }

  login(username, password) {
    this.inputUsername.setValue(username);
    this.inputPassword.setValue(password);
    this.btnSubmit.click();
  }

  open() {
    return browser.url(process.env.NUXEO_URL ? `${process.env.NUXEO_URL}logout` : 'logout');
  }
}

export default new LoginPage();
