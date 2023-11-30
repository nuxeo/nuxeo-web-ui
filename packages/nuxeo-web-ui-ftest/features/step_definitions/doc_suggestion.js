import { Then } from '../../node_modules/@cucumber/cucumber';

Then('I can navigate to the document selected in the {string} single document suggestion widget', async function(name) {
  const docPage = await this.ui.browser.documentPage('DocSuggestion');

  docPage.metadata
    .layout()
    .getField(name)
    .element('.selectivity-single-selected-item')
    .element('a')
    .click();
});
