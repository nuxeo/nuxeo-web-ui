import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';

Given('I am on vocabulary page', async function() {
  const administration = await this.ui.administration;
  const vocabularyPage = await administration.goToVocabularyManagement();
  return vocabularyPage;
});

When('I select {string} vocabulary', async function(name) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  await vocabularyManagement.vocabulary(name);
});

Then('I can add {string} entry', async function(id) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  await vocabularyManagement.addNewEntry(id, id);
});

Then('I can see the vocabulary table', async function() {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const isVocabularyTableVisible = await vocabularyManagement.isVocabularyTableVisible;
  isVocabularyTableVisible.should.be.true;
});

Then('I have a non empty table', async function() {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const isVocabularyTableFilled = await vocabularyManagement.isVocabularyTableFilled;
  isVocabularyTableFilled.should.be.true;
});

Then('I can see {string} entry', async function(name) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const hasEntry = await vocabularyManagement.waitForHasEntry(name);
  hasEntry.should.be.true;
});

Then('I cannot see {string} entry', async function(name) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const hasNoEntry = await vocabularyManagement.waitForHasEntry(name, true);
  hasNoEntry.should.be.true;
});

Then('I can delete entry with index {int}', async function(index) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  await vocabularyManagement.deleteEntry(index);
});

Then('I can edit entry with index {int} and new label {string}', async function(index, label) {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  await vocabularyManagement.editEntry(index, label);
});

Then('I can see edit dialog', async function() {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const hasEditDialog = await vocabularyManagement.hasEditDialog();
  hasEditDialog.should.be.true;
});

Then('I can see create dialog', async function() {
  const administration = await this.ui.administration;
  await administration.waitForVisible();
  const vocabularyManagement = await administration.vocabularyManagement;
  await vocabularyManagement.waitForVisible();
  const hasCreateDialog = await vocabularyManagement.hasCreateDialog();
  await hasCreateDialog.should.be.true;
});
