import { Given, Then, When } from '@cucumber/cucumber';

When(/^I give (\w+) permission to "([^"]*)" on the document$/, function(permission, name) {
  this.ui.browser.permissionsViewButton.waitForVisible();
  this.ui.browser.permissionsViewButton.click();
  this.ui.browser.permissionsView.waitForVisible();
  this.ui.browser.permissionsView.newPermissionButton.waitForVisible();
  this.ui.browser.permissionsView.newPermissionButton.click();
  this.ui.browser.permissionsView.setPermissions(name, {
    permission,
    timeFrame: 'permanent',
    notify: false,
  });
  this.ui.browser.permissionsView.createPermissionButton.waitForVisible();
  this.ui.browser.permissionsView.createPermissionButton.click();
  this.ui.browser.permissionsView.permission(permission, name, 'permanent').waitForVisible();
});

When(/^I give (\w+) permission on the document to the following users:$/, function(permission, table) {
  this.ui.browser.permissionsViewButton.waitForVisible();
  this.ui.browser.permissionsViewButton.click();
  this.ui.browser.permissionsView.waitForVisible();
  this.ui.browser.permissionsView.newPermissionButton.waitForVisible();
  this.ui.browser.permissionsView.newPermissionButton.click();

  table.rows().forEach((row) => {
    this.ui.browser.permissionsView.setPermissions(row[0], {
      permission,
      timeFrame: 'permanent',
      notify: false,
    });
  });

  this.ui.browser.permissionsView.createPermissionButton.waitForVisible();
  this.ui.browser.permissionsView.createPermissionButton.click();
});

Given(/^"([^"]*)" has (\w+) permission on the document$/, function(name, permission) {
  fixtures.documents.setPermissions(this.doc, permission, name).then((d) => {
    this.doc = d;
  });
});

Then(/^I can see that "([^"]*)" has the (\w+) permission$/, function(name, permission) {
  this.ui.browser.permissionsView.permission(permission, name).waitForVisible().should.be.true;
});

When(/^I edit the (\w+) permission on the document for "([^"]*)" to start (\w+)$/, function(permission, name, date) {
  this.ui.browser.permissionsViewButton.waitForVisible();
  this.ui.browser.permissionsViewButton.click();
  this.ui.browser.permissionsView.waitForVisible();
  this.ui.browser.permissionsView.permission(permission, name).waitForVisible();
  this.ui.browser.permissionsView.editPermissionButton.waitForVisible();
  if (date === 'tomorrow') {
    date = new Date();
    date.setDate(date.getDate() + 1);
  }
  this.ui.browser.permissionsView.editPermissionButton.click();
  this.ui.browser.permissionsView.waitForVisible();
  this.ui.browser.permissionsView.editPermissions({
    permission,
    timeFrame: 'datebased',
    begin: date,
    notify: false,
  });
  this.ui.browser.permissionsView.updatePermissionButton.click();
  this.ui.browser.permissionsView.permission(permission, name, 'datebased').waitForVisible();
});
