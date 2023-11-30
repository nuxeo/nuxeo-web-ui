import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I click the bulk edit button with {string} layout', async function(layoutName) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const selectionToolbarElem = await browser.selectionToolbar;
  await selectionToolbarElem.waitForVisible();
  await selectionToolbarElem.clickResultsActionMenu(`nuxeo-edit-documents-button[layout=${layoutName}]`);
});

Then('I can bulk edit multiple properties in {string} layout:', async function(layoutName, table) {
  const action = await this.ui.bulkEdit(`nuxeo-edit-documents-button[layout="${layoutName}"]`);
  const dialogElem = await action.dialog;
  await dialogElem.waitForDisplayed();
  await action.editMultipleOptions(table);
  console.log('the End.............');
  driver.pause(10000);
  const saveButtonElem = await action.saveButton;
  await saveButtonElem.click();
});

Then('I see a toast notification with the following message {string}', async function(message) {
  const notificationMessage = await this.ui.getToastMessage(message);
  console.log('notificationMessage', notificationMessage);
  const trimmedMessage = message.trim().replace(/"/g, '');
  notificationMessage.should.be.equals(trimmedMessage);
});

Then('I click the toast notification dismiss button', async function() {
  const snackbar = await this.ui.getToastDismissButton();
  await snackbar.click();
  await this.ui.waitForToastNotVisible();
});
