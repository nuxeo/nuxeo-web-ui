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
    driver.url('/logout');
    return new this();
  }

}
