'use strict';

module.exports = function () {
  this.When(/^I select user from the dropdown menu$/, () => {
    this.ui.user.dropdown.waitForVisible();
    this.ui.user.userItem.click();
  });

  this.When(/^I can see the new user form$/, () => {
    this.ui.user.createUserForm.waitForVisible();
  });

  this.Then(/^I can create a user with the following properties:$/, (table) => {
    this.ui.user.fillMultipleValues(table, this.ui.user.createUserDialog);
    this.ui.user.createUserButton.click();
  });

  this.Then(/^I can search for the user "([^"]*)"$/, (username) => {
    this.ui.user.searchFor(username);
    this.ui.user.searchResult(username).waitForVisible().should.be.true;
  });

  this.Then(/^I can edit the user "([^"]*)" with the following properties:$/, (username, table) => {
    this.ui.user.searchFor(username);
    this.ui.user.searchResult(username).waitForVisible();
    this.ui.user.searchResult(username).click();
    this.ui.user.editUserButton.click();
    this.ui.user.fillMultipleValues(table, this.ui.user.editUserDialog);
    this.ui.user.editUserDialogButton.click();
  });

  this.Then(/^I can delete the user "([^"]*)"$/, (username) => {
    this.ui.user.searchFor(username);
    this.ui.user.searchResult(username).waitForVisible();
    this.ui.user.searchResult(username).click();
    this.ui.user.deleteUserButton.click();
    this.ui.user.confirmDeleteUserButton.click();
  });
};
