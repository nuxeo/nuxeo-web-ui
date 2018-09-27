const {
  Then,
  When,
} = require('cucumber');

When(/^I select group from the dropdown menu$/, function () {
  this.ui.group.dropdown.waitForVisible();
  this.ui.group.groupItem.click();
});

When(/^I can see the new group form$/, function () {
  this.ui.group.createGroupForm.waitForVisible();
});

Then(/^I can create a group with the following properties:$/, function (table) {
  this.ui.group.fillMultipleValues(table);
  this.ui.group.createGroupButton.click();
});

Then(/^I can search for the following groups$/, function (table) {
  table.rows().forEach((row) => {
    this.ui.group.searchFor(row[0]);
    this.ui.group.searchResult(row[0]).waitForVisible().should.be.true;
  });
});

Then(/^I can edit the following groups$/, function (table) {
  table.rows().forEach((row) => {
    this.ui.group.searchFor(row[0]);
    this.ui.group.searchResult(row[0]).waitForVisible();
    this.ui.group.searchResult(row[0]).click();
    this.ui.group.editGroupButton.waitForVisible();
    this.ui.group.editGroupButton.click();
    fixtures.layouts.setValue(this.ui.group.editGroupLabel, row[1]);
    this.ui.group.editGroupDialogButton.click();
    browser.back();
  });
});

Then(/^I can delete the following groups$/, function (table) {
  table.rows().forEach((row) => {
    this.ui.group.searchFor(row[0]);
    this.ui.group.searchResult(row[0]).waitForVisible();
    this.ui.group.searchResult(row[0]).click();
    this.ui.group.deleteGroupButton.waitForVisible();
    this.ui.group.deleteGroupButton.click();
    this.ui.group.confirmDeleteGroupButton.click();
  });
});
