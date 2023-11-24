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
  await action.saveButton.click();
});

Then('I see a toast notification with the following message {string}', function(message) {
  const notificationMessage = this.ui.getToastMessage(message);
  const trimmedMessage = message.trim().replace(/"/g, '');
  notificationMessage.should.be.equals(trimmedMessage);
});

Then('I click the toast notification dismiss button', function() {
  this.ui.getToastDismissButton().click();
  this.ui.waitForToastNotVisible();
});
