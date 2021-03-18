import { Given, Then, When } from '@cucumber/cucumber';

Given('I am on vocabulary page', function() {
  return this.ui.administration.goToVocabularyManagement();
});

When('I select {string} vocabulary', function(name) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.vocabulary(name);
});

Then('I can add {string} entry', function(id) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.addNewEntry(id, id);
});

Then('I can see the vocabulary table', function() {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.isVocabularyTableVisible.should.be.true;
});

Then('I have a non empty table', function() {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.isVocabularyTableFilled.should.be.true;
});

Then('I can see {string} entry', function(name) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForHasEntry(name).should.be.true;
});

Then('I cannot see {string} entry', function(name) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForHasEntry(name, true).should.be.true;
});

Then('I can delete entry with index {int}', function(index) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.deleteEntry(index);
});

Then('I can edit entry with index {int} and new label {string}', function(index, label) {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.editEntry(index, label);
});

Then('I can see edit dialog', function() {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.hasEditDialog.should.be.true;
});

Then('I can see create dialog', function() {
  this.ui.administration.waitForVisible();
  this.ui.administration.vocabularyManagement.waitForVisible();
  this.ui.administration.vocabularyManagement.hasCreateDialog.should.be.true;
});
