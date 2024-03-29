// eslint-disable-next-line import/no-extraneous-dependencies
import { When } from '@cucumber/cucumber';

/**
 * Import the csv file
 *
 * @deprecated since 3.0.3. Please use "I upload the (.+) on the tab content page" located in create_dialog.js
 * */
When(/^I import the (.+) file$/, async function(file) {
  const dialog = await this.ui.createDialog;
  await dialog.waitForVisible();
  await dialog.setFileToImport(file);
  const selectedFileToImport = await dialog.selectedFileToImport;
  const selectVisible = await selectedFileToImport.waitForVisible();
  await selectVisible.should.be.true;
  const importcb = await dialog.importCSVButton;
  const csvButton = await importcb.waitForVisible();
  csvButton.should.be.true;
  await importcb.click();
  const importSuccess = await dialog.importSuccess;
  await importSuccess.waitForVisible();
  const importCloseButton = await dialog.importCloseButton;
  const closeButton = await importCloseButton.waitForVisible();
  closeButton.should.be.true;
  await importCloseButton.click();
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
