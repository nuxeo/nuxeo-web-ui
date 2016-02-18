"use strict";

import LoginPage from '../../pages/login';

const USERS = {
  'Administrator': 'Administrator'
};

module.exports = function () {

  this.Given(/^I am "([^"]*)"$/, (username) => this.username = username);

  this.When(/^I login as "([^"]*)"$/, (username) => {
    var login = LoginPage.get();
    login.username = username;
    login.password = USERS[username];
    login.submit();
  });

  this.When(/^I visit (.*)$/, (url) => browser.url(url));

  this.When(/^I logout/, () => browser.url("/logout"));

  this.Then(/^I am logged in as "([^"]*)"$/, (username) => browser.isVisible(`span.${username}`).should.be.true);

  this.Then(/^I am logged out/, () => browser.isVisible('#username').should.be.true);
};