import { When } from 'cucumber';

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
