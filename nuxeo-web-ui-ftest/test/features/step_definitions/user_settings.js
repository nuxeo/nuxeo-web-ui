'use strict';

module.exports = function () {
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
};
