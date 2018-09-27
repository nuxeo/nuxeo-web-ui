'use strict';

module.exports = function () {
  /* Cloud Services */

  this.Given(/^the following OAuth2 providers exist$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.oauth2Providers.create(row[0]));
    });
    return Promise.all(promises);
  });

  this.Given(/^I have tokens for the following OAuth2 providers$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.oauth2Providers.createToken(row[0], this.username));
    });
    return Promise.all(promises);
  });

  this.When(/^I am on user cloud services page$/, () => {
    this.ui.goToUserCloudServices();
  });

  this.Then(/^I can only see (\d+) provider token[s]? that belong[s]? to me$/, (numberOfTokens) => {
    this.ui.userCloudServices.waitForVisible();
    const tokens = this.ui.userCloudServices.getTokens(this.username);
    tokens.length.toString().should.equal(numberOfTokens);
  });

  this.Then(/^I can delete token for provider "(.+)" that belongs to me$/, (provider) => {
    this.ui.userCloudServices.waitForVisible();
    const tokens = this.ui.userCloudServices.getTokens(this.username, provider);
    tokens.length.should.equal(1);
    const deleteButton = tokens[0].deleteButton();
    deleteButton.waitForVisible();
    deleteButton.click();
    driver.alertAccept();
    this.ui.userCloudServices.waitForVisible();
    driver.waitUntil(() => this.ui.userCloudServices.getTokens(this.username, provider).length === 0);
  });

  /* Authorized Applications */

  this.Given(/^the following OAuth2 clients exist$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.oauth2Clients.create(row[0]));
    });
    return Promise.all(promises);
  });

  this.Given(/^I have tokens for the following OAuth2 clients$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.oauth2Clients.createToken(row[0], this.username));
    });
    return Promise.all(promises);
  });

  this.When(/^I am on user authorized applications page$/, () => {
    this.ui.goToUserAuthorizedApps();
  });

  this.Then(/^I can see "(.+)" as an authorized application$/, (application) => {
    this.ui.userAuthorizedApps.waitForVisible();
    const tokens = this.ui.userAuthorizedApps.getApps(application);
    tokens.length.should.equal(1);
  });

  this.Then(/^I can only see (\d+) authorized application[s]?$/, (numberOfApps) => {
    const apps = this.ui.userAuthorizedApps.getApps();
    apps.length.toString().should.equal(numberOfApps);
  });

  this.Then(/^I can revoke access for "(.+)" application$/, (appName) => {
    this.ui.userAuthorizedApps.waitForVisible();
    browser.waitUntil(() => this.ui.userAuthorizedApps.getApps().length > 0);
    const apps = this.ui.userAuthorizedApps.getApps(appName);
    apps.length.should.equal(1);
    const revokeButton = apps[0].revokeButton();
    revokeButton.waitForVisible();
    revokeButton.click();
    driver.alertAccept();
    this.ui.userAuthorizedApps.waitForVisible();
    driver.waitUntil(() => this.ui.userAuthorizedApps.getApps(appName).length === 0);
  });
};
