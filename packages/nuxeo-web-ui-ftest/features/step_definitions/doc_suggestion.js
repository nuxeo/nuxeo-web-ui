import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can navigate to the document selected in the {string} single document suggestion widget', function(name) {
  this.ui.browser
    .documentPage('DocSuggestion')
    .metadata.layout()
    .getField(name)
    .element('.selectivity-single-selected-item')
    .element('a')
    .click();
});
