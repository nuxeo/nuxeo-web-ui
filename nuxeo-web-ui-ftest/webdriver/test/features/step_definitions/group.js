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

  this.Then(/^I can search for the following groups$/, (table) => {
    table.rows().forEach((row) => {
      this.ui.group.searchFor(row[0]);
      this.ui.group.searchResult(row[0]).waitForVisible().should.be.true;
    });
  });

  this.Then(/^I can edit the following groups$/, (table) => {
    table.rows().forEach((row) => {
      this.ui.group.searchFor(row[0]);
      this.ui.group.searchResult(row[0]).waitForVisible();
      this.ui.group.searchResult(row[0]).click();
      this.ui.group.editGroupButton.click();
      fixtures.layouts.setValue(this.ui.group.editGroupLabel, row[1]);
      this.ui.group.editGroupDialogButton.click();
    });
  });

  this.Then(/^I can delete the following groups$/, (table) => {
    table.rows().forEach((row) => {
      this.ui.group.searchFor(row[0]);
      this.ui.group.searchResult(row[0]).waitForVisible();
      this.ui.group.searchResult(row[0]).click();
      this.ui.group.deleteGroupButton.click();
      this.ui.group.confirmDeleteGroupButton.click();
    });
  });
};
