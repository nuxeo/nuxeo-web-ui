import { Then, When } from '@cucumber/cucumber';

When('I click on Add Properties button', function() {
  this.ui.createDialog.addProperties.waitForVisible();
  this.ui.createDialog.addProperties.click();
});

Then('I select {string} asset type', function(val) {
  this.ui.createDialog.selectAnAssetType.waitForVisible();
  this.ui.createDialog.selectAnAssetType.click();
  this.ui.createDialog.selectAssetType(val);
});

Then('I click the Create button to complete the import', function() {
  const importButton = this.ui.createDialog.importCreateButtonProperties;
  importButton.waitForVisible();
  importButton.waitForEnabled();
  importButton.click();
});

Then('I add the following properties:', function(table) {
  this.ui.createDialog.documentImportLayout.fillMultipleValues(table);
});

Then('I click on Apply to all', function() {
  this.ui.createDialog.applyAll.click();
});
