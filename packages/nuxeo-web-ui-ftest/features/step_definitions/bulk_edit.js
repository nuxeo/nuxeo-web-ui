import { Then } from '@cucumber/cucumber';

Then('I click the edit button', function() {
  this.ui.bulkEdit.clickEditDocumentsButton();
});

Then('I see a dialog with editing options', function() {
  this.ui.bulkEdit.dialog.isVisible().should.be.true;
  this.ui.bulkEdit.bulkDefaultLayout.isVisible().should.be.true;
});

Then('I can edit multiple properties:', function(table) {
  this.ui.bulkEdit.editMultipleOptions(table);
});

Then('I click the save button', function() {
  this.ui.bulkEdit.clickSaveButton();
});

Then(/I see a toast notification with the following message (.+)/, function(message) {
  this.ui.toastNotification.isVisible().should.be.true;
  this.ui.toastNotificationMessage.should.be.equals(message);
});

Then('I click the dismiss button', function() {
  this.ui.closeToastNotification();
  this.ui.waitForToastNotVisible();
  this.ui.toastNotification.isVisible().should.be.false;
});
