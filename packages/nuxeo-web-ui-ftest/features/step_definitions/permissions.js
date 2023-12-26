import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';

When(/^I give (\w+) permission to "([^"]*)" on the document$/, async function(permission, name) {
  const viewButtonEle = await this.ui.browser.permissionsViewButton;
  await viewButtonEle.waitForVisible();
  await viewButtonEle.click();
  const viewEle = await this.ui.browser.permissionsView;
  await viewEle.waitForVisible();
  const newPermissionEle = await viewEle.newPermissionButton;
  await newPermissionEle.waitForVisible();
  await newPermissionEle.click();
  await viewEle.setPermissions(name, {
    permission,
    timeFrame: 'permanent',
    notify: false,
  });
  const createPermissionEle = await viewEle.createPermissionButton;
  await createPermissionEle.waitForVisible();
  await createPermissionEle.click();
  await viewEle.permission(permission, name, 'permanent');
});

When(/^I give (\w+) permission on the document to the following users:$/, async function(permission, table) {
  const viewButtonEle = await this.ui.browser.permissionsViewButton;
  await viewButtonEle.waitForVisible();
  await viewButtonEle.click();
  const viewEle = await this.ui.browser.permissionsView;
  await viewEle.waitForVisible();
  const newPermissionEle = await viewEle.newPermissionButton;
  await newPermissionEle.waitForVisible();
  await newPermissionEle.click();

  table.rows().forEach(async (row) => {
    await viewEle.setPermissions(row[0], {
      permission,
      timeFrame: 'permanent',
      notify: false,
    });
  });

  const createPermissionEle = await viewEle.createPermissionButton;
  await createPermissionEle.waitForVisible();
  await createPermissionEle.click();
});

Given(/^"([^"]*)" has (\w+) permission on the document$/, function(name, permission) {
  fixtures.documents.setPermissions(this.doc, permission, name).then((d) => {
    this.doc = d;
  });
});

Then(/^I can see that "([^"]*)" has the (\w+) permission$/, async function(name, permission) {
  const permissionEle = await this.ui.browser.permissionsView.permission(permission, name);
  permissionEle.should.be.true;
});

When(/^I edit the (\w+) permission on the document for "([^"]*)" to start (\w+)$/, async function(
  permission,
  name,
  date,
) {
  const viewButtonEle = await this.ui.browser.permissionsViewButton;
  await viewButtonEle.waitForVisible();
  await viewButtonEle.click();
  const viewEle = await this.ui.browser.permissionsView;
  await viewEle.waitForVisible();
  await viewEle.permission(permission, name);
  const editPermissionEle = await this.ui.browser.permissionsView.editPermissionButton;
  await editPermissionEle.waitForVisible();
  if (date === 'tomorrow') {
    date = new Date();
    date.setDate(date.getDate() + 1);
  }
  await editPermissionEle.click();
  await viewEle.waitForVisible();
  await viewEle.editPermissions({
    permission,
    timeFrame: 'datebased',
    begin: date,
    notify: false,
  });
  const updateEle = await viewEle.updatePermissionButton;
  await updateEle.click();
  const isPermission = await viewEle.permission(permission, name, 'datebased');
  isPermission.should.be.true;
});
