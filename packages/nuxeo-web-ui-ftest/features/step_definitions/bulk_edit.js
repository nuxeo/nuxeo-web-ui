import { Then } from '@cucumber/cucumber';

Then('I click the bulk edit button', function() {
  this.ui.bulkEdit.editDocumentsButton.click();
});

Then('I can bulk edit multiple properties:', function(table) {
  this.ui.bulkEdit.dialog.waitForDisplayed();
  this.ui.bulkEdit.bulkDefaultLayout.waitForDisplayed();
  this.ui.bulkEdit.editMultipleOptions(table);
  this.ui.bulkEdit.saveButton.click();
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
