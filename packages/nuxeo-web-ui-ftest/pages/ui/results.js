import BasePage from '../base';

export default class Results extends BasePage {
  get noResults() {
    // XXX using a more specific selector to return the visible label
    return this.el.element('div.emptyResult:not([style=""])');
  }

  get actions() {
    return this.el.element('slot[name="actions"]');
  }

  get displayModes() {
    return this.el.elements('div.resultActions paper-icon-button.displayMode');
  }

  get displayMode() {
    driver.waitUntil(() => this.displayModes.some((displayMode) => displayMode.isVisible()));
    const displayMode = this.displayModes.filter((result) => result.getAttribute('disabled') !== null);
    return displayMode[0]
      .getAttribute('title')
      .replace('Switch to ', '')
      .replace(/ view| View/, '')
      .toLowerCase();
  }

  get toggleTableView() {
    return this.displayModes.find((e) => e.getAttribute('title').includes('Table View'));
  }

  get toggleColumnSettings() {
    return this.el.element('nuxeo-data-table[name="table"] #toggleColSettings');
  }

  get columnsSettingsPopup() {
    return this.el.element('nuxeo-data-table[name="table"] #columnsSettingsPopup');
  }

  get columnsCloseButton() {
    return this.columnsSettingsPopup.element('paper-button.primary');
  }

  getResults(displayMode) {
    switch (displayMode) {
      case 'grid':
        return this.el.elements('nuxeo-document-grid-thumbnail, nuxeo-justified-grid-item');
      case 'list':
        return this.el.elements('nuxeo-document-list-item');
      default:
        return this.el.elements('nuxeo-data-table[name="table"] div.item');
    }
  }

  getColumnCheckbox(heading) {
    this.el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"]');
    const tr = this.el
      .elements('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"] tr')
      .find((e) => e.getText() === heading);
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
    this.el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    const row = this.el.element('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    row.waitForVisible('nuxeo-data-table-cell:not([hidden])');
    return row.elements('nuxeo-data-table-cell:not([hidden])').find((e) => e.getText() === heading);
  }

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    return rows ? rows.filter((result) => result.getAttribute('hidden') === null).length : 0;
  }

  get resultsCountLabel() {
    return this.el.element('div.resultActions .resultsCount');
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
    return this.el.element('nuxeo-delete-documents-button[hard]');
  }

  get untrashDocumentsButton() {
    return this.el.element('nuxeo-untrash-documents-button');
  }
}
