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

When('I login as {string}', { timeout: 120000 }, async function(username) {
  console.log("🔵 LOGIN START", username);
  // Ensure clean browser state on every login
  await browser.deleteCookies();
  console.log("🔵 Session reloaded");

  console.log("🔵 Getting Login page…");
  const logIn = await Login.get();
  console.log("🟢 Login page loaded");

  console.log("🔵 Filling username:", username);
  await logIn.username(username);
  
  const password = await users[username];
  console.log("🔵 Filling password for", username);
  await logIn.password(password);

  console.log("🔵 Submitting login…");
  await logIn.submit();

  console.log("🔵 Waiting for redirect to UI…");

  await browser.waitUntil(
    async () => {
      const u = await browser.getUrl();
      return !u.includes('login.jsp') && u.includes('/ui');
    },
    {
      timeout: 30000,
      interval: 200,
      timeoutMsg: 'UI did not load after login — still stuck on login.jsp'
    }
  );

  console.log("🟢 Redirected to UI:", await browser.getUrl());

  this.username = username;
  console.log("🔵 Getting UI…");
  this.ui = await UI.get();
  console.log("🟢 UI loaded");

  console.log("🔵 Waiting for nuxeo-page…");
  await this.ui.waitForVisible('nuxeo-page');
  console.log("🟢 nuxeo-page visible");
});

When(/^I visit (.*)$/, (path) => url(path));

When('I logout', async () => Login.get());

Then('I am logged in as {string}', async function(username) {
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
