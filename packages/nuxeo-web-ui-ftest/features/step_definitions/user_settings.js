import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';

/* Cloud Services */

Given(/^the following OAuth2 providers exist$/, (table) =>
  Promise.all(table.rows().map((row) => fixtures.oauth2Providers.create(row[0]))),
);

Given(/^I have tokens for the following OAuth2 providers$/, function(table) {
  return Promise.all(table.rows().map((row) => fixtures.oauth2Providers.createToken(row[0], this.username)));
});

When(/^I am on user cloud services page$/, function() {
  return this.ui.goToUserCloudServices();
});

Then(/^I can only see (\d+) provider token[s]? that belong[s]? to me$/, function(numberOfTokens) {
  this.ui.userCloudServices.waitForVisible();
  driver.waitUntil(() => this.ui.userCloudServices.getTokens(this.username).length === numberOfTokens, {
    timeout: 10000,
    timeoutMsg: 'expected 0018 text to be different after 5s',
  });
});

Then(/^I can delete token for provider "(.+)" that belongs to me$/, function(provider) {
  this.ui.userCloudServices.waitForVisible();
  let tokens;
  driver.waitUntil(
    () => {
      tokens = this.ui.userCloudServices.getTokens(this.username, provider);
      return tokens.length === 1;
    },
    {
      timeout: 10000,
      timeoutMsg: 'expected 0019 text to be different after 5s',
    },
  );
  const deleteButton = tokens[0].deleteButton();
  deleteButton.waitForVisible();
  deleteButton.click();
  driver.alertAccept();
  this.ui.userCloudServices.waitForVisible();
  driver.waitUntil(() => this.ui.userCloudServices.getTokens(this.username, provider).length === 0, {
    timeout: 10000,
    timeoutMsg: 'expected 0020 text to be different after 5s',
  });
});

/* Authorized Applications */

Given(/^the following OAuth2 clients exist$/, (table) =>
  Promise.all(table.rows().map((row) => fixtures.oauth2Clients.create(row[0]))),
);

Given(/^I have tokens for the following OAuth2 clients$/, function(table) {
  return Promise.all(table.rows().map((row) => fixtures.oauth2Clients.createToken(row[0], this.username)));
});

When(/^I am on user authorized applications page$/, async function() {
  await this.ui.goToUserAuthorizedApps();
});

Then(/^I can see "(.+)" as an authorized application$/, function(application) {
  this.ui.userAuthorizedApps.waitForVisible();
  let tokens;
  driver.waitUntil(() => {
    tokens = this.ui.userAuthorizedApps.getApps(application);
    return tokens.length === 1;
  });
});

Then(/^I can only see (\d+) authorized application[s]?$/, async function(numberOfApps) {
  await driver.waitUntil(() => this.ui.userAuthorizedApps.getApps().length === numberOfApps, {
    timeout: 10000,
    timeoutMsg: 'expected 0021 text to be different after 5s',
  });
});

Then('I cannot see authorized application', function() {
  this.ui.emptyAuthorizedApps.waitForDisplayed();
});

Then(/^I can revoke access for "(.+)" application$/, function(appName) {
  this.ui.userAuthorizedApps.waitForVisible();
  browser.waitUntil(() => this.ui.userAuthorizedApps.getApps().length > 0, {
    timeout: 10000,
    timeoutMsg: 'expected 0022 text to be different after 5s',
  });
  const apps = this.ui.userAuthorizedApps.getApps(appName);
  apps.length.should.equal(1);
  const revokeButton = apps[0].revokeButton();
  revokeButton.waitForVisible();
  revokeButton.click();
  driver.alertAccept();
  this.ui.userAuthorizedApps.waitForVisible();
  driver.waitUntil(() => this.ui.userAuthorizedApps.getApps(appName).length === 0, {
    timeout: 10000,
    timeoutMsg: 'expected 0023 text to be different after 5s',
  });
});
