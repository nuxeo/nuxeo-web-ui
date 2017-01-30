'use strict';

module.exports = function () {
  this.Given('I am on vocabulary page', () => this.ui.vocabularyAdmin);

  this.When('I select "$name" vocabulary', (name) => {
    this.ui.vocabularyAdmin.vocabulary(name);
  });

  this.Then('I can add "$childId" entry', (id) => {
    this.ui.vocabularyAdmin.addNewEntry(id, id);
  });

  this.Then('I can see the vocabulary table', () => {
    this.ui.vocabularyAdmin.isVocabularyTableVisible.should.be.true;
  });

  this.Then('I have a non empty table', () => {
    this.ui.vocabularyAdmin.isVocabularyTableFilled.should.be.true;
  });

  this.Then('I can see "$name" entry', (name) => {
    this.ui.vocabularyAdmin.waitForHasEntry(name).should.be.true;
  });

  this.Then('I cannot see "$name" entry', (name) => {
    this.ui.vocabularyAdmin.waitForHasEntry(name, true).should.be.true;
  });

  this.Then('I can delete entry with index "$index"', (index) => {
    this.ui.vocabularyAdmin.deleteEntry(index);
  });

  this.Then('I can edit entry with index "$index" and new label "$label"', (index, label) => {
    this.ui.vocabularyAdmin.editEntry(index, label);
  });

  this.Then('I can see edit dialog', () => {
    this.ui.vocabularyAdmin.hasEditDialog.should.be.true;
  });

  this.Then('I can see create dialog', () => {
    this.ui.vocabularyAdmin.hasCreateDialog.should.be.true;
  });
};
