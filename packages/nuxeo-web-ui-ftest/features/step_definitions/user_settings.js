// eslint-disable-next-line import/no-extraneous-dependencies
import { Given, Then, When } from '@cucumber/cucumber';

/* Cloud Services */

Given(/^the following OAuth2 providers exist$/, async (table) => {
  Promise.all(table.rows().map(async (row) => fixtures.oauth2Providers.create(row[0])));
});

Given(/^I have tokens for the following OAuth2 providers$/, function(table) {
  return Promise.all(table.rows().map((row) => fixtures.oauth2Providers.createToken(row[0], this.username)));
});

When(/^I am on user cloud services page$/, async function() {
  const cloudServicesEle = await this.ui.goToUserCloudServices();
  return cloudServicesEle;
});

Then(/^I can only see (\d+) provider token[s]? that belong[s]? to me$/, async function(numberOfTokens) {
  const cloudService = await this.ui.userCloudServices;
  await cloudService.waitForVisible();
  const tokenEle = await cloudService.getTokens(this.username);
  if (tokenEle.length !== numberOfTokens) {
    throw new Error('Provider token no.s are not as expected');
  }
});

Then(/^I can delete token for provider "(.+)" that belongs to me$/, async function(provider) {
  const cloudServicePage = await this.ui.userCloudServices;
  await cloudServicePage.waitForVisible();
  const tokenEle = await cloudServicePage.getTokens(this.username, provider);
  tokenEle.length.should.be.equal(1);
  const deleteButton = await tokenEle[0].deleteButton();
  await deleteButton.waitForVisible();
  await deleteButton.click();
  await driver.alertAccept();
  await cloudServicePage.waitForVisible();
  const tokenAfterDelete = await cloudServicePage.getTokens(this.username, provider);
  tokenAfterDelete.length.should.be.equal(0);
});

/* Authorized Applications */

Given(/^the following OAuth2 clients exist$/, async (table) =>
  Promise.all(table.rows().map(async (row) => fixtures.oauth2Clients.create(row[0]))),
);

Given(/^I have tokens for the following OAuth2 clients$/, async function(table) {
  return Promise.all(table.rows().map(async (row) => fixtures.oauth2Clients.createToken(row[0], this.username)));
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
  await driver.pause(3000);
  const authPage = await this.ui.userAuthorizedApps;
  await authPage.waitForVisible();
  const apps = await authPage.getApps();
  if (apps.length !== numberOfApps) {
    throw new Error(`Expected app count should be ${numberOfApps} but found ${apps.length}`);
  }
});

Then('I cannot see authorized application', async function() {
  const apps = await this.ui.emptyAuthorizedApps;
  await apps.waitForDisplayed();
});

Then(/^I can revoke access for "(.+)" application$/, async function(appName) {
  const authPage = await this.ui.userAuthorizedApps;
  await authPage.waitForVisible();
  const apps = await authPage.getApps();
  await browser.waitUntil(() => apps.length > 0);
  const appRevoke = await authPage.getApps(appName);
  appRevoke.length.should.equal(1);
  const app = await appRevoke[0];
  const revokeButton = await app.revokeButton();
  await revokeButton.waitForVisible();
  await revokeButton.click();
  await driver.alertAccept();
  await authPage.waitForVisible();
  const appResults = await authPage.getApps(appName);
  if (appResults.length !== 0) {
    throw new Error(`Expected app count should be 0 but found ${appResults.length}`);
  }
});
