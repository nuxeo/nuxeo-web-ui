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
    const displayMode = this.resultActions.value.filter((result) => result.getAttribute('hidden'));
    return displayMode[0].getAttribute('title').replace('Switch to ', '').replace(/ view| View/, '').toLowerCase();
  }

  get toggleTableView() {
    return this.el.element('///*[contains(@title, "Table View")]');
  }

  get toggleColumnSettings() {
    return this.el.element('#toggleColSettings');
  }

  get columnsSettingsPopup() {
    return this.el.element('#columnsSettingsPopup');
  }

  get columnsCloseButton() {
    return driver.element('//body/nuxeo-dialog[@id="columnsSettingsPopup"]/div/paper-button');
  }

  get saveSearchAsButton() {
    return driver.element('//paper-button[contains(., "Save As")]');
  }

  get confirmSaveSearchButton() {
    return driver.element('//*[@id="saveDialog"]/div/paper-button[contains(., "Save")]');
  }

  get menuButton() {
    return driver.element('#menuButton');
  }

  get savedSearchActionButton() {
    return driver.element('paper-icon-button.nuxeo-saved-search-actions');
  }

  get shareAction() {
    return driver.element(
      '//paper-menu-button[contains (@class, "nuxeo-saved-search-actions")]//paper-item[contains (., "Share")]'
    );
  }

  getResults(displayMode) {
    switch (displayMode) {
      case 'grid':
        return this.el.elements('#list #items nuxeo-document-grid-thumbnail');
      case 'list':
        return this.el.elements('#list #items nuxeo-document-list-item');
      default:
        return this.el.elements('#list #items div.item');
    }
  }

  getColumnCheckbox(heading) {
    return driver.element(
      `//td[contains(., "${heading}")]/preceding::td[1]/paper-checkbox`
    );
  }

  checkColumnCheckbox(heading) {
    const checkbox = driver.element(
      `//td[contains(., "${heading}")]/preceding::td[1]/paper-checkbox`);
    if (checkbox.getAttribute('checked') === null) {
      return checkbox.click();
    }
  }

  getResultsColumn(heading) {
    return driver.element(`//nuxeo-data-table-cell/div[text()="${heading}"]`);
  }

  getSavedSearch(searchName) {
    return driver.element(
      `//paper-menu-button[@id="menuButton"]//paper-item[contains(., "${searchName}")]`
    );
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
      this.el.element(`#paperInput #input`).waitForVisible();
      return this.el.element(`#paperInput #input`).setValue(searchTerm);
    } else {
      this.setFieldValue(searchType, searchTerm);
    }
  }

  fulltextSearch(searchTerm) {
    this.el.element(`#paperInput #input`).waitForVisible();
    return this.el.element(`#paperInput #input`).setValue(searchTerm);
  }

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    const res = rows.value.filter((result) => {
      if (result.getAttribute('hidden') === null) {
        return result;
      }
    });
    return res.length;
  }

  quickSearchResultsCount() {
    const rows = this.el.elements('#results #selector a');
    const res = rows.value.filter((result) => {
      if (result.getAttribute('hidden') === null) {
        return result;
      }
    });
    return res.length;
  }
}
