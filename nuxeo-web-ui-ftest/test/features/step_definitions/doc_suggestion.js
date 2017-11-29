'use strict';

module.exports = function () {
  this.Then('I can navigate to the document selected in the "$name" single document suggestion widget', (name) =>
      this.ui.browser.documentPage('DocSuggestion')
      .metadata.layout().getField(name)
      .element('.selectivity-single-selected-item')
      .element('a')
      .click());
};
