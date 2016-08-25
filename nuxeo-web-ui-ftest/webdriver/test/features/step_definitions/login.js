'use strict';

import Login from '../../pages/login';
import UI from '../../pages/ui';
var Nuxeo = require('nuxeo');

const USERS = {
  Administrator: 'Administrator',
};

module.exports = function () {
  this.Given('I am "$username"', (username) => this.username = username);

  this.When('I login as "$username"', (username) => {
    const login = Login.get();
    login.username = username;
    login.password = USERS[username];
    login.submit();
    this.client = new Nuxeo({
      auth: {
        method: 'basic',
        username: username,
        password: USERS[username]
      }
    });
    this.ui = UI.get();
  });

  this.When(/^I visit (.*)$/, (url) => driver.url(url));

  this.When('I logout', () => driver.url('/logout'));

  this.Then('I am logged in as "$username"', (username) => {
    driver.isExisting(`//section[@name="profile"]//h1[contains(text(),"${username}")]`).should.be.true;
    // XXX: this.ui.drawer.profile.getText('h1').should.be.equal(username);
  });

  this.Then('I am logged out', () => driver.isVisible('#username').should.be.true);
};
