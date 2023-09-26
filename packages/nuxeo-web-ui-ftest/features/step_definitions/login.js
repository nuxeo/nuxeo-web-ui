import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';
import Login from '../../pages/login';
import UI from '../../pages/ui';
import { url } from '../../pages/helpers';

Given('user {string} exists in group {string}', async (username, group) => {
  const users = await fixtures.users;
  await users.create({
    'entity-type': 'user',
    properties: {
      username,
      firstName: username,
      email: `${username}@test.com`,
      password: fixtures.users.DEFAULT_PASSWORD,
      groups: [group],
    },
  });
});

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

When('I login as {string}', async function(username) {
  const logIn = await Login.get();
  await logIn.username(username);
  const password = users[username];
  await logIn.password(password);
  await logIn.submit();
  this.username = username;
  this.ui = await UI.get();
  await this.ui.waitForVisible('nuxeo-page');
});

When(/^I visit (.*)$/, (path) => url(path));

When('I logout', async () => Login.get());

Then('I am logged in as {string}', async function(username) {
  const profileEle = await this.ui.drawer.open('profile');
  const headerEle = await profileEle.element('.header');
  await driver.pause(1000);
  const currentUser = await headerEle.getText();
  currentUser.toLowerCase().should.be.equal(username.toLowerCase());
});

Then('I am logged out', async () => {
  const isVisible = await driver.isVisible('#username');
  isVisible.should.be.true;
});
