import { When } from 'cucumber';

When(/^I go to the (.+) tab$/, function(name) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.importTab(name).click();
});

When(/^I import the (.+) file$/, function(file) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.setFileToImport(file);
  dialog.selectedFileToImport.waitForVisible().should.be.true;
  dialog.importCsvButton.click();
  dialog.importSuccess.waitForVisible();
  dialog.importError.isVisible().should.be.false;
  dialog.importCloseButton.click();
});
