'use strict';

import LoginPage from '../../pages/login';

const USERS = {
  Administrator: 'Administrator',
};

module.exports = function () {
  this.Given('I am "$username"', (username) => this.username = username);

  this.When('I login as "$username"', (username) => {
    const login = LoginPage.get();
    login.username = username;
    login.password = USERS[username];
    login.submit();
  });

  this.When(/^I visit (.*)$/, (url) => driver.url(url));

  this.When('I logout', () => driver.url('/logout'));

  this.Then('I am logged in as "$username"', (username) => driver.isVisible(`span.${username}`).should.be.true);

  this.Then('I am logged out', () => driver.isVisible('#username').should.be.true);
};
