import { Then } from '@cucumber/cucumber';

Then('I can navigate to the document selected in the {string} single document suggestion widget', async function(name) {
  const docpageEle = await this.ui.browser.documentPage('DocSuggestion');
  const docmetaEle = await docpageEle.metadata;
  const layoutEle = await docmetaEle.layout();
  const fieldEle = await layoutEle.getField(name);
  const singleItemELe = await fieldEle.element('.selectivity-single-selected-item');
  const elementEx = await singleItemELe.element('a');
  elementEx.click();
});
