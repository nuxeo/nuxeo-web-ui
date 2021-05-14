import { When } from '@cucumber/cucumber';

/**
 * Import the csv file
 *
 * @deprecated since 3.0.3. Please use "I upload the (.+) on the tab content page" located in create_dialog.js
 * */
When(/^I import the (.+) file$/, function(file) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.setFileToImport(file);
  dialog.selectedFileToImport.waitForVisible().should.be.true;
  dialog.importCSVButton.click();
  dialog.importSuccess.waitForVisible();
  dialog.importCloseButton.waitForVisible();
  dialog.importCloseButton.click();
});

When('I can see that the csv file is imported with no errors', function() {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.selectedCSVToImport.waitForVisible().should.be.true;
  dialog.importCSVButton.click();
  dialog.importSuccess.waitForVisible();
  dialog.importError.isVisible().should.be.false;
  dialog.importCloseButton.waitForVisible();
  dialog.importCloseButton.click();
});
