'use strict';

module.exports = function () {
  this.When(/^I select group from the dropdown menu$/, () => {
    this.ui.group.dropdown.waitForVisible();
    this.ui.group.groupItem.click();
  });

  this.When(/^I can see the new group form$/, () => {
    this.ui.group.createGroupForm.waitForVisible();
  });

  this.Then(/^I can create a group with the following properties:$/, (table) => {
    this.ui.group.fillMultipleValues(table);
    this.ui.group.createGroupButton.click();
  });

  this.Then(/^I can search for the group "([^"]*)"$/, (groupname) => {
    this.ui.group.searchFor(groupname);
    this.ui.group.searchResult(groupname).waitForVisible().should.be.true;
  });

  this.Then(/^I can edit the group "([^"]*)" label as "([^"]*)"$/, (groupname, newLabel) => {
    this.ui.group.searchResult(groupname).waitForVisible();
    this.ui.group.searchResult(groupname).click();
    this.ui.group.editGroupButton.click();
    fixtures.layouts.setValue(this.ui.group.editGroupLabel, newLabel);
    this.ui.group.editGroupDialogButton.click();
  });

  this.Then(/^I can delete the group$/, () => {
    this.ui.group.deleteGroupButton.click();
    this.ui.group.confirmDeleteGroupButton.click();
  });
};
