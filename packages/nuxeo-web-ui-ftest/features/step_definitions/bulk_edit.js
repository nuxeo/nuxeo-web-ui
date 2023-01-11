import { Then } from '@cucumber/cucumber';

Then('I click the bulk edit button with {string} layout',async function(layoutName) {
  await this.ui.browser.selectionToolbar.clickResultsActionMenu(`nuxeo-edit-documents-button[layout=${layoutName}]`);
});

Then('I can bulk edit multiple properties in {string} layout:',async function(layoutName, table) {
  const action = await this.ui.bulkEdit(`nuxeo-edit-documents-button[layout="${layoutName}"]`);
  await action.dialog.waitForDisplayed();
  await action.editMultipleOptions(table);
  action.saveButton.click();
});

Then('I see a toast notification with the following message {string}',async function(message) {
  const notificationMessage = await this.ui.getToastMessage(message);
  const trimmedMessage = await message.trim().replace(/"/g, '');
  notificationMessage.should.be.equals(trimmedMessage);
});

Then('I click the toast notification dismiss button',async function() {
  await this.ui.getToastDismissButton().click();
  await this.ui.waitForToastNotVisible();
});
