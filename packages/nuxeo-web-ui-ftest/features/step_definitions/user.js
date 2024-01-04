import { Then, When } from '../../node_modules/@cucumber/cucumber';

When(/^I select user from the dropdown menu$/, async function() {
  const dropdownEle = await this.ui.user.dropdown;
  await dropdownEle.waitForVisible();
  const itemEle = await this.ui.user.userItem;
  await itemEle.click();
});

When(/^I can see the new user form$/, async function() {
  const formEle = await this.ui.user.createUserForm;
  await formEle.waitForVisible();
});

Then(/^I can create a user with the following properties:$/, async function(table) {
  await this.ui.user.fillMultipleValues(table, this.ui.user.createUserDialog);
  const buttonEle = await this.ui.user.createUserButton;
  await buttonEle.click();
});

Then(/^I can search for the user "([^"]*)"$/, async function(username) {
  await this.ui.user.searchFor(username);
  await this.ui.user.waitForVisible('nuxeo-card[name="users"] .table nuxeo-user-tag');
  const groupEle = await this.ui.group.el.$('nuxeo-card[name="users"] .table nuxeo-user-tag');
  await groupEle.click();
  await this.ui.group.waitForVisible('nuxeo-user-management');
  const user = await this.ui.group.el.elements('.user.heading');
  const userEle = await user.find(async (e) => (await e.getText()) === username);
  const isVisible = await userEle.waitForVisible();
  isVisible.should.be.true;
});

Then(/^I can see the user has the email "([^"]*)"$/, async function(userEmail) {
  const user = await this.ui.user.el.element('nuxeo-view-user [name="email"]');
  const ele = await user.element('span');
  const emailText = await ele.getText();
  if (emailText !== userEmail) {
    throw Error("I can't see the expected email for user");
  }
});

Then(/^I can edit the user "([^"]*)" with the following properties:$/, async function(username, table) {
  await this.ui.user.searchFor(username);
  const resultEle = await this.ui.user.searchResult(username);
  await resultEle.click();
  const editButton = await this.ui.user.editUserButton;
  await editButton.waitForVisible();
  await editButton.click();
  await this.ui.user.fillMultipleValues(table, this.ui.user.editUserDialog);
  const dialogButton = await this.ui.user.editUserDialogButton;
  await dialogButton.click();
});

Then(/^I can delete the user "([^"]*)"$/, async function(username) {
  await this.ui.user.searchFor(username);
  const result = await this.ui.user.searchResult(username);
  await result.click();
  const buttonEle = await this.ui.user.deleteUserButton;
  await buttonEle.waitForVisible();
  await buttonEle.click();
  const confirmButton = await this.ui.user.confirmDeleteUserButton;
  await confirmButton.click();
});
