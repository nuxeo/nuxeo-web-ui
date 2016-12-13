'use strict';

export default class Login {

  set username(username) {
    driver.setValue('#username', username);
  }

  set password(password) {
    driver.setValue('#password', password);
  }

  submit() {
    return driver.click('[name="Submit"]');
  }

  static get() {
    const baseUrl = process.env.NUXEO_URL || '';
    driver.url(`${baseUrl}/logout`);
    return new this();
  }

}
