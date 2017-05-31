'use strict';

module.exports = function () {
  this.When(/^I give (\w+) permission to "([^"]*)" on the document$/, (permission, name) => {
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

  this.When(/^"([^"]*)" has (\w+) permission on the document$/, (name, permission) => {
    fixtures.documents.setPermissions(this.doc, permission, name).then((d) => { this.doc = d; });
  });

  this.Then(/^I can see that "([^"]*)" has the (\w+) permission$/, (name, permission) => {
    this.ui.browser.permissionsView.permissionUser(name).waitForVisible();
    this.ui.browser.permissionsView.permissionUser(name).isVisible().should.be.true;
    this.ui.browser.permissionsView.permission(permission).waitForVisible();
    this.ui.browser.permissionsView.permission(permission).isVisible().should.be.true;
  });

  this.When(/^I edit the (\w+) permission for "([^"]*)" to start (\w+)$/, (permission, name, date) => {
    driver.url(`#!/browse${this.doc.path}`);
    this.ui.browser.permissionsViewButton.click();
    this.ui.browser.permissionsView.permissionUser(name).waitForVisible();
    this.ui.browser.permissionsView.editPermissionButton.waitForVisible();
    if (date === 'tomorrow') {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate() + 1;
      const year = currentDate.getFullYear();
      date = `${month}-${day}-${year}`;
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

  this.Then(/^I can't view the document$/, () => {
    driver.url(`#!/browse${this.doc.path}`);
    this.ui.browser.breadcrumb.should.not.be.visible;
  });
};
