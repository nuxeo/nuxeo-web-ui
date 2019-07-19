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
    return displayMode[0]
      .getAttribute('title')
      .replace('Switch to ', '')
      .replace(/ view| View/, '')
      .toLowerCase();
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
    return this.columnsSettingsPopup.element('paper-button.primary');
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
    this.el.waitForVisible('nuxeo-dialog[id="columnsSettingsPopup"]');
    const tr = this.el.elementByTextContent('nuxeo-dialog[id="columnsSettingsPopup"] tr', heading);
    tr.waitForVisible('paper-checkbox');
    return tr.element('paper-checkbox');
  }

  checkColumnCheckbox(heading) {
    const checkbox = this.getColumnCheckbox(heading);
    if (checkbox.getAttribute('checked') === null) {
      return checkbox.click();
    }
  }

  getResultsColumn(heading) {
    this.el.waitForVisible('nuxeo-data-table-row[header]');
    const row = this.el.element('nuxeo-data-table-row[header]');
    row.waitForVisible('nuxeo-data-table-cell:not([hidden])');
    return row.elementByTextContent('nuxeo-data-table-cell:not([hidden])', heading);
  }

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    return rows.value.filter((result) => result.getAttribute('hidden') === null).length;
  }

  deleteDocuments() {
    const el = this.deleteDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  untrashDocuments() {
    const el = this.untrashDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  get deleteDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-delete-documents-button[hard] #deleteAllButton');
  }

  get untrashDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-untrash-documents-button #untrashAllButton');
  }
}
