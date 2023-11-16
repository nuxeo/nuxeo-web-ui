import BasePage from '../base';

export default class Results extends BasePage {
  get noResults() {
    // XXX using a more specific selector to return the visible label
    return this.el.$('div.emptyResult:not([style=""])');
  }

  get actions() {
    return this.el.$('slot[name="actions"]');
  }

  get displayModes() {
    return this.el.$$('div.resultActions paper-icon-button.displayMode');
  }

  get displayMode() {
    return (async () => {
      this.displayModes.some((displayMode) => displayMode.isVisible());
      const displayMode = await this.displayModes.filter((result) => result.getAttribute('disabled') !== null);
      return displayMode[0]
        .getAttribute('title')
        .replace('Switch to ', '')
        .replace(/ view| View/, '')
        .toLowerCase();
    })();
  }

  get toggleTableView() {
    return this.displayModes.find((e) => e.getAttribute('title').includes('Table View'));
  }

  get toggleColumnSettings() {
    return this.el.$('nuxeo-data-table[name="table"] #toggleColSettings');
  }

  get columnsSettingsPopup() {
    return this.el.$('nuxeo-data-table[name="table"] #columnsSettingsPopup');
  }

  get columnsCloseButton() {
    return this.columnsSettingsPopup.$('paper-button.primary');
  }

  getResults(displayMode) {
    switch (displayMode) {
      case 'grid':
        return this.el.$$('nuxeo-document-grid-thumbnail, nuxeo-justified-grid-item');
      case 'list':
        return this.el.$$('nuxeo-document-list-item');
      default:
        return this.el.$$('nuxeo-data-table[name="table"] div.item');
    }
  }

  getColumnCheckbox(heading) {
    this.el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"]');
    const tr = this.el
      .$$('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"] tr')
      .find((e) => e.getText() === heading);
    tr.waitForVisible('paper-checkbox');
    return tr.$('paper-checkbox');
  }

  checkColumnCheckbox(heading) {
    const checkbox = this.getColumnCheckbox(heading);
    if (checkbox.getAttribute('checked') === null) {
      return checkbox.click();
    }
  }

  getResultsColumn(heading) {
    this.el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    const row = this.el.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    row.waitForVisible('nuxeo-data-table-cell:not([hidden])');
    return row.$$('nuxeo-data-table-cell:not([hidden])').find((e) => e.getText() === heading);
  }

  resultsCount(displayMode) {
    const rows = this.getResults(displayMode);
    return rows ? rows.filter((result) => result.getAttribute('hidden') === null).length : 0;
  }

  get resultsCountLabel() {
    return this.el.$('div.resultActions .resultsCount');
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
    return this.el.$('nuxeo-delete-documents-button[hard]');
  }

  get untrashDocumentsButton() {
    return this.el.$('nuxeo-untrash-documents-button');
  }
}
