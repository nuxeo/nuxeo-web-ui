// eslint-disable-next-line import/no-extraneous-dependencies
import { Given, Then, When } from '@cucumber/cucumber';
import Login from '../../pages/login.js';
import UI from '../../pages/ui.js';
import { url } from '../../pages/helpers.js';

Given('user {string} exists in group {string}', async (username, group) => {
  const users = await fixtures.users;
  await driver.pause(1000);
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

Given('user {string} exists', async (username) => {
  const users = await fixtures.users;
  await driver.pause(1000);
  await users.create({
    'entity-type': 'user',
    properties: {
      username,
      firstName: username,
      email: `${username}@test.com`,
      password: fixtures.users.DEFAULT_PASSWORD,
    },
  });
});

When('I login as {string}', { timeout: 120000 }, async function (username) {
  const logIn = await Login.get();
  const password = await users[username];
  if (!password) {
    throw new Error(`No password found for user "${username}" — was the user created before login?`);
  }
  await logIn.username(username);
  await logIn.password(password);
  await logIn.submit();

  let hasRetried = false;
  const submitTime = Date.now();
  await browser.waitUntil(
    async () => {
      const u = await browser.getUrl();
      if (u.includes('/ui') && !u.includes('login.jsp')) {
        return true;
      }
      // Only retry ONCE, and only after giving the server 10s to process the initial submit
      if (u.includes('login.jsp') && !hasRetried && Date.now() - submitTime > 10000) {
        hasRetried = true;
        try {
          await logIn.username(username);
          await logIn.password(password);
          await logIn.submit();
        } catch (e) {
          // page may have navigated away during retry — ignore
        }
      }
      return false;
    },
    {
      timeout: 30000,
      interval: 2000,
      timeoutMsg: `UI did not load after login as "${username}" — still stuck on login.jsp`,
    },
  );

  this.username = username;
  this.ui = await UI.get();

  await this.ui.waitForVisible('nuxeo-page');
});

When(/^I visit (.*)$/, (path) => url(path));

When('I logout', async () => Login.get());

Then('I am logged in as {string}', async function (username) {
  const drawer = await this.ui.drawer;
  const profileEle = await drawer.open('profile');
  const headerEle = await profileEle.element('.header');
  await driver.pause(1000);
  const currentUser = await headerEle.getText();
  currentUser.toLowerCase().should.be.equal(username.toLowerCase());
});

Then('I am logged out', async () => {
  const isVisible = await driver.isVisible('#username');
  isVisible.should.be.true;
});
