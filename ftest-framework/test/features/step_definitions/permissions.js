'use strict';

module.exports = function () {
  this.When(/^I give (\w+) permission to "([^"]*)" on the document$/, (permission, name) => {
    this.ui.browser.permissionsViewButton.waitForVisible();
    this.ui.browser.permissionsViewButton.click();
    this.ui.browser.permissionsView.waitForVisible();
    this.ui.browser.permissionsView.newPermissionButton.click();
    this.ui.browser.permissionsView.setPermissions(name,
      {
        permission,
        timeFrame: 'permanent',
        notify: false,
      }
    );
    this.ui.browser.permissionsView.createPermissionButton.waitForVisible();
    this.ui.browser.permissionsView.createPermissionButton.click();
  });

  this.Given(/^"([^"]*)" has (\w+) permission on the document$/, (name, permission) => {
    fixtures.documents.setPermissions(this.doc, permission, name).then((d) => { this.doc = d; });
  });

  this.Then(/^I can see that "([^"]*)" has the (\w+) permission$/, (name, permission) => {
    this.ui.browser.permissionsView.permissionUser(name).waitForVisible().should.be.true;
    this.ui.browser.permissionsView.permission(permission).waitForVisible().should.be.true;
  });

  this.When(/^I edit the (\w+) permission on the document for "([^"]*)" to start (\w+)$/, (permission, name, date) => {
    this.ui.browser.permissionsViewButton.click();
    this.ui.browser.permissionsView.permissionUser(name).waitForVisible();
    this.ui.browser.permissionsView.editPermissionButton.waitForVisible();
    if (date === 'tomorrow') {
      const tmp = new Date();
      tmp.setDate(tmp.getDate() + 1);
      const keys = tmp.toISOString().substring(0, 10).split('-');
      date = keys[1].concat('-').concat(keys[2]).concat('-').concat('-').concat(keys[0]);
    }
    this.ui.browser.permissionsView.editPermissionButton.click();
    this.ui.browser.permissionsView.editPermissions(
      {
        permission,
        timeFrame: 'datebased',
        begin: date,
        notify: false,
      }
    );
    this.ui.browser.permissionsView.updatePermissionButton.click();
  });
};
