'use strict';

import BasePage from '../base';

export default class Search extends BasePage {

  get quickSearchResults() {
    return this.el.elements('#results #selector a');
  }

  get noResults() {
    return this.el.element('div.emptyResult');
  }

  get resultActions() {
    return this.el.elements('div.resultActions paper-icon-button.displayMode');
  }

  get displayMode() {
    this.resultActions.waitForVisible();
    const displayMode = this.resultActions.value.filter((result) => result.getAttribute('disabled') !== null);
    return displayMode[0].getAttribute('title').replace('Switch to ', '').replace(/ view| View/, '').toLowerCase();
  }

  get toggleTableView() {
    return this.resultActions.value.find((e) => e.getAttribute('title').includes('Table View'));
  }

  get toggleColumnSettings() {
    return this.el.element('#toggleColSettings');
  }

  get columnsSettingsPopup() {
    return this.el.element('#columnsSettingsPopup');
  }

  get columnsCloseButton() {
    return this.columnsSettingsPopup.element('//div/paper-button');
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

  getResults(displayMode) {
    switch (displayMode) {
      case 'grid':
        return this.el.elements('nuxeo-document-grid-thumbnail');
      case 'list':
        return this.el.elements('nuxeo-document-list-item');
      default:
        return this.el.elements('div.item');
    }
  }

  getColumnCheckbox(heading) {
    this.el.waitForVisible('tr');
    return this.el.elementByTextContent('tr', heading).element('paper-checkbox');
  }

  checkColumnCheckbox(heading) {
    const checkbox = this.getColumnCheckbox(heading);
    if (checkbox.getAttribute('checked') === null) {
      return checkbox.click();
    }
  }

  getResultsColumn(heading) {
    const row = this.el.element('nuxeo-data-table-row[header]');
    row.waitForVisible();
    row.waitForVisible('nuxeo-data-table-cell');
    return row.elementByTextContent('nuxeo-data-table-cell', heading);
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
      this.fulltextSearch(searchTerm);
      driver.keys('Enter');
    } else {
      this.setFieldValue(searchType, searchTerm);
    }
  }

  fulltextSearch(searchTerm) {
    this.el.element(`#searchInput #nativeInput`).waitForVisible();
    return this.el.element(`#searchInput #nativeInput`).setValue(searchTerm);
  }

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    return rows.value.filter((result) => result.getAttribute('hidden') === null).length;
  }

  quickSearchResultsCount() {
    const rows = this.el.element('#results #selector').elements('//a');
    return rows.value.filter((result) => result.getAttribute('hidden') === null).length;
  }
}
