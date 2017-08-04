'use strict';

module.exports = function () {
  this.Given('I am on vocabulary page', () => this.ui.administration.goToVocabularyManagement());

  this.When('I select "$name" vocabulary', (name) => {
    this.ui.administration.vocabularyManagement.vocabulary(name);
  });

  this.Then('I can add "$childId" entry', (id) => {
    this.ui.administration.vocabularyManagement.addNewEntry(id, id);
  });

  this.Then('I can see the vocabulary table', () => {
    this.ui.administration.vocabularyManagement.isVocabularyTableVisible.should.be.true;
  });

  this.Then('I have a non empty table', () => {
    this.ui.administration.vocabularyManagement.isVocabularyTableFilled.should.be.true;
  });

  this.Then('I can see "$name" entry', (name) => {
    this.ui.administration.vocabularyManagement.waitForHasEntry(name).should.be.true;
  });

  this.Then('I cannot see "$name" entry', (name) => {
    this.ui.administration.vocabularyManagement.waitForHasEntry(name, true).should.be.true;
  });

  this.Then('I can delete entry with index "$index"', (index) => {
    this.ui.administration.vocabularyManagement.deleteEntry(index);
  });

  this.Then('I can edit entry with index "$index" and new label "$label"', (index, label) => {
    this.ui.administration.vocabularyManagement.editEntry(index, label);
  });

  this.Then('I can see edit dialog', () => {
    this.ui.administration.vocabularyManagement.hasEditDialog.should.be.true;
  });

  this.Then('I can see create dialog', () => {
    this.ui.administration.vocabularyManagement.hasCreateDialog.should.be.true;
  });
};
