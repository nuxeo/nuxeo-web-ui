'use strict';

import BasePage from '../base';

export default class Results extends BasePage {

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

  getResults(displayMode) {
    switch (displayMode) {
      case 'grid':
        return this.el.elements('nuxeo-document-grid-thumbnail');
      case 'list':
        return this.el.elements('nuxeo-document-list-item');
      default:
        return this.el.elements('nuxeo-data-table div.item');
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

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    return rows.value.filter((result) => result.getAttribute('hidden') === null).length;
  }
}
