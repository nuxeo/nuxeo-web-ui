'use strict';

import Results from './results';

export default class Search extends Results {

  get quickSearchResults() {
    return this.el.elements('#results #selector a');
  }

  get saveSearchAsButton() {
    driver.waitForVisible('#actions paper-button');
    return driver.elementByTextContent('#actions paper-button', 'SAVE AS');
  }

  get confirmSaveSearchButton() {
    driver.waitForVisible('#saveDialog paper-button.primary');
    return driver.element('#saveDialog paper-button.primary');
  }

  get menuButton() {
    return this.el.element('#menuButton');
  }

  get savedSearchActionButton() {
    return driver.element('nuxeo-saved-search-actions paper-icon-button');
  }

  get shareAction() {
    driver.waitForVisible('nuxeo-saved-search-actions paper-item');
    return driver.elementByTextContent('nuxeo-saved-search-actions paper-item', 'Share');
  }

  getSavedSearch(searchName) {
    driver.waitUntil(() => {
      const els = driver.elements('nuxeo-search-form[name="defaultSearch"] #actionsDropdown paper-item').value;
      return els.length > 1;
    });
    // XXX should be using driver.elementByTextContent but element returns empty text because the respective paper-item
    // is not interactable (nor visible)
    const e = driver.execute((name) => {
      const dropdown = document.querySelector(`* >>> nuxeo-search-form[name="defaultSearch"] >>> #actionsDropdown`);
      return document.evaluate(`.//paper-item[text()="${name}"]`, dropdown, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
          null).singleNodeValue;
    }, searchName);
    return e;
  }

  enterInput(text) {
    return driver.keys(text);
  }

  getField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    return this.el.element(`[name="${field}"]`);
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  search(searchType, searchTerm) {
    if (searchType === 'fulltext') {
      this.el.element(`#searchInput #nativeInput`).waitForVisible();
      this.el.element(`#searchInput #nativeInput`).setValue(searchTerm);
      driver.keys('Enter');
    } else {
      this.setFieldValue(searchType, searchTerm);
    }
  }

  quickSearchResultsCount() {
    const rows = this.el.element('#results #selector').elements('//a');
    return rows.value.filter((result) => result.getAttribute('hidden') === null).length;
  }
}
