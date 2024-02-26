import { Then, When } from '@cucumber/cucumber';

When('I click on Add Properties button', async function() {
  const createDialog = await this.ui.createDialog;
  const addProperties = await createDialog.addProperties;
  await addProperties.waitForVisible();
  await addProperties.click();
});

Then('I select {string} asset type', async function(val) {
  const createDialog = await this.ui.createDialog;
  const assetType = await createDialog.selectAnAssetType;
  await assetType.waitForVisible();
  await assetType.click();
  await createDialog.selectAssetType(val);
});

Then('I click the Create button to complete the import', async function() {
  const createDialog = await this.ui.createDialog;
  const importButton = await createDialog.importCreateButtonProperties;
  await importButton.waitForVisible();
  await importButton.waitForEnabled();
  await importButton.click();
});

Then('I add the following properties:', async function(table) {
  const createDialog = await this.ui.createDialog;
  const docImport = await createDialog.documentImportLayout;
  await docImport.fillMultipleValues(table);
});

Then('I click on Apply to all', async function() {
  const createDialog = await this.ui.createDialog;
  const applyAll = await createDialog.applyAll;
  await applyAll.click();
});
