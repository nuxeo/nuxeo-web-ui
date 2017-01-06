'use strict';

import Login from '../../pages/login';
import UI from '../../pages/ui';
var Nuxeo = require('nuxeo');

const USERS = {
  Administrator: 'Administrator',
};

module.exports = function () {

  this.Given('I am on vocabulary page', () => {
    return this.ui.vocabularyAdmin;
  });

  this.When('I select "$name" vocabulary', (name) => {
    this.ui.vocabularyAdmin.vocabulary(name);
  });

  this.Then('I can add new vocabulary entry', () => {
    this.ui.vocabularyAdmin.isAddNewEntryVisible.should.be.true;
  });

  this.Then('I can see the vocabulary table', () => {
    this.ui.vocabularyAdmin.isVocabularyTableVisible.should.be.true;
  });

  this.Then('I have a non empty table', () => {
    this.ui.vocabularyAdmin.isVocabularyTableFilled.should.be.true;
  });

};
