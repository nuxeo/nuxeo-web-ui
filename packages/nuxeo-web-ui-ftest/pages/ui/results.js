/* eslint-disable no-await-in-loop */
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
    return (async () => {
      const ele = await this.el.$$('div.resultActions paper-icon-button.displayMode');
      return ele;
    })();
  }

  get displayMode() {
    return (async () => {
      const displayModesRows = await this.displayModes;
      const displayModeArr = [];
      for (let i = 0; i < displayModesRows.length; i++) {
        const row = displayModesRows[i];
        if ((await row.getAttribute('disabled')) !== null) {
          displayModeArr.push(row);
        }
      }
      const attr = await displayModeArr[0].getAttribute('title');
      return attr
        .replace('Switch to ', '')
        .replace(/ view| View/, '')
        .toLowerCase();
    })();
  }

  get toggleTableView() {
    return (async () => {
      const displayModesRows = await this.displayModes;
      for (let i = 0; i < displayModesRows.length; i++) {
        const row = displayModesRows[i];
        const attr = await row.getAttribute('title');
        if (attr.includes('Table View')) {
          return row;
        }
      }
    })();
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

  async getColumnCheckbox(heading) {
    const ele = await this.el;
    await ele.$('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"]').waitForVisible();
    const rows = await ele.$$('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"] tr');
    const elementTitle = await ele
      .$$('nuxeo-data-table[name="table"] nuxeo-dialog[id="columnsSettingsPopup"] tr')
      .map((img) => img.getText());
    const index = elementTitle.findIndex((currenTitle) => currenTitle === heading);
    const result = await rows[index].$('paper-checkbox');
    await result.waitForVisible();
    return result;
  }

  async checkColumnCheckbox(heading) {
    const checkbox = await this.getColumnCheckbox(heading);
    if ((await checkbox.getAttribute('checked')) === null) {
      return checkbox.click();
    }
  }

  async getResultsColumn(heading) {
    const ele = await this.el;
    await ele.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]').waitForVisible();
    const row = await ele.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    const rowElement = await row.$('nuxeo-data-table-cell:not([hidden])');
    await rowElement.waitForVisible();
    const titleRows = await row.$$('nuxeo-data-table-cell:not([hidden])');
    const rowTitles = await row.$$('nuxeo-data-table-cell:not([hidden])').map((img) => img.getText());
    const index = rowTitles.findIndex((currenTitle) => currenTitle === heading);
    const result = await titleRows[index];
    return result;
  }

  async resultsCount(displayMode) {
    const rows = await this.getResults(displayMode);
    let elementCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const elementsHidden = await row.getAttribute('hidden');
      if (elementsHidden === null) {
        elementCount++;
      }
    }
    return elementCount;
  }

  get resultsCountLabel() {
    return (async () => {
      const ele = await this.el;
      return ele.$('div.resultActions .resultsCount');
    })();
  }

  async deleteDocuments() {
    const el = await this.deleteDocumentsButton;
    await el.waitForVisible();
    await el.click();
  }

  async untrashDocuments() {
    const el = await this.untrashDocumentsButton;
    await el.waitForVisible();
    await el.click();
  }

  get deleteDocumentsButton() {
    return this.el.$('nuxeo-delete-documents-button[hard]');
  }

  get untrashDocumentsButton() {
    return this.el.$('nuxeo-untrash-documents-button');
  }
}
