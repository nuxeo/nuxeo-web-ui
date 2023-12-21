import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I click the bulk edit button with {string} layout', function(layoutName) {
  this.ui.browser.selectionToolbar.clickResultsActionMenu(`nuxeo-edit-documents-button[layout=${layoutName}]`);
});

Then('I can bulk edit multiple properties in {string} layout:', function(layoutName, table) {
  const action = this.ui.bulkEdit(`nuxeo-edit-documents-button[layout="${layoutName}"]`);
  action.dialog.waitForDisplayed();
  action.editMultipleOptions(table);
  action.saveButton.click();
});

Then('I see a toast notification with the following message {string}', function(message) {
  const notificationMessage = this.ui.getToastMessage(message);
  const trimmedMessage = message.trim().replace(/"/g, '');
  notificationMessage.should.be.equals(trimmedMessage);
});

Then('I click the toast notification dismiss button', async function() {
  const snackbar = await this.ui.getToastDismissButton();
  await snackbar.click();
  await this.ui.waitForToastNotVisible();
});
