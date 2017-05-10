'use strict';

module.exports = function () {

  this.When('I click the new user/group button', () => {
    this.ui.userGroup.userButton.waitForVisible();
    this.ui.userGroup.userButton.click();
  });

  this.When(/^I select (.+) from the dropdown menu$/, (userOrGroup) => {
    this.ui.userGroup.dropdown.waitForVisible();
    this.ui.userGroup.item(userOrGroup).click();
  });

  this.When(/^I can see the new (.+) form$/, (userOrGroup) => {
    this.ui.userGroup.form(userOrGroup).waitForVisible();
  });

  this.Then(/^I can create a user with the following properties:$/, (table) => {
    this.ui.userGroup.setPassword().click();
    this.ui.userGroup.fillMultipleValues(table);
    this.ui.userGroup.createUserButton.click();
  });

  this.Then(/^I can search for the user "([^"]*)"$/, (username) => {
    this.ui.userGroup.searchFor(username);
    this.ui.userGroup.searchResult(username).waitForVisible();
    this.ui.userGroup.searchResult(username).isVisible().should.be.true;
  });

  this.Then(/^I can edit the user "([^"]*)" with the following properties:$/, (username, table) => {
    this.ui.userGroup.searchResult(username).click();
    this.ui.userGroup.editUserButton.click();
    this.ui.userGroup.fillMultipleValues(table, this.ui.userGroup.editUserDialog);
    this.ui.userGroup.editUserDialogButton.click();
  });

  this.Then(/^I can delete the user "([^"]*)"$/, (username) => {
    this.ui.userGroup.deleteUserButton.click();
    this.ui.userGroup.confirmDeleteUserButton.click();

  });

};