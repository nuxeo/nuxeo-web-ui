import { Given, Then, When } from '@cucumber/cucumber';
import Login from '../../pages/login';
import UI from '../../pages/ui';
import { url } from '../../pages/helpers';

Given('user {string} exists in group {string}', (username, group) =>
  fixtures.users.create({
    'entity-type': 'user',
    properties: {
      username,
      firstName: username,
      email: `${username}@test.com`,
      password: fixtures.users.DEFAULT_PASSWORD,
      groups: [group],
    },
  }),
);

Given('user {string} exists', (username) =>
  fixtures.users.create({
    'entity-type': 'user',
    properties: {
      username,
      firstName: username,
      email: `${username}@test.com`,
      password: fixtures.users.DEFAULT_PASSWORD,
    },
  }),
);

When('I login as {string}', function(username) {
  const login = Login.get();
  login.username = username;
  login.password = users[username];
  login.submit();
  this.username = username;
  this.ui = UI.get();
  driver.waitForVisible('nuxeo-page');
});

When(/^I visit (.*)$/, (path) => url(path));

When('I logout', () => Login.get());

Then('I am logged in as {string}', function(username) {
  const currentUser = this.ui.drawer
    .open('profile')
    .element('.header')
    .getText()
    .toLowerCase();
  currentUser.should.be.equal(username.toLowerCase());
});

Then('I am logged out', () => driver.isVisible('#username').should.be.true);
