import Results from './results';
import DocumentPermissions from './browser/document_permissions';

export default class Search extends Results {
  get quickSearchResults() {
    this.waitForVisible('#results #selector');
    return this.el.elements('#results #selector a');
  }

  get saveSearchAsButton() {
    return (async () => {
      const eles = await driver.$('#actions paper-button');
      await eles.waitForVisible();
      const buttons = await driver.$$('#actions paper-button');
      const rowTitles = await driver.$$('#actions paper-button').map((img) => img.getText());
      const index = rowTitles.findIndex((currenTitle) => currenTitle === 'Save As');
      const result = await buttons[index];
      return result;
    })();
  }

  get confirmSaveSearchButton() {
    return (async () => {
      const ele = await driver.$('#saveDialog paper-button.primary');
      await ele.waitForVisible();
      return ele;
    })();
  }

  get menuButton() {
    return (async () => {
      const ele = await this.el;
      return ele.element('#menuButton');
    })();
  }

  get savedSearchActionButton() {
    return driver.element('nuxeo-saved-search-actions paper-icon-button');
  }

  get shareAction() {
    return (async () => {
      const ele = await driver.$('nuxeo-saved-search-actions paper-item');
      await ele.waitForVisible();
      const buttons = await driver.$$('nuxeo-saved-search-actions paper-item');

      let rowIndex;
      for (let index = 0; index < buttons.length; index++) {
        const buttonText = await buttons[index].getText()
        if (buttonText=== 'Share') {
          rowIndex = index;
          break;
        }
      }
      return buttons[rowIndex];
    })();
  }

  get permissionsView() {
    return new DocumentPermissions(`${this._selector} nuxeo-document-permissions`);
  }

  async getSavedSearch(savedSearchName) {
    const selector = await this._selector;
    const els = await driver.elements(`${selector} #actionsDropdown paper-item`);
    if (els.length > 1) {
      return els[1];
    }
    const ele = await this.el;
    const dropdownList = await ele.elements('#actionsDropdown paper-item');
    const dropdownElenent = await dropdownList.find(async (e) => (await e.getText()) === savedSearchName);
    return dropdownElenent;
  }

  enterInput(text) {
    return driver.keys(text);
  }

  async getField(field) {
    await driver.waitForExist(this._selector);
    await driver.waitForVisible(this._selector);
    const ele = await this.el.$(`[name="${field}"]`);
    return ele;
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.getValue(fieldEl);
  }

  async setFieldValue(field, value) {
    const fieldEl = await this.getField(field);
    await fieldEl.waitForVisible();
    await fieldEl.scrollIntoView();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  async search(searchType, searchTerm) {
    if (searchType === 'fulltext') {
      const searchInputEle = await this.el.$('#searchInput .input-element input');
      await searchInputEle.waitForVisible();
      await searchInputEle.setValue(searchTerm);
      await driver.keys('Enter');
    } else {
      await this.setFieldValue(searchType, searchTerm);
    }
  }

  async quickSearchResultsCount() {
    const ele = await this.el;
    const selector = await ele.element('#results #selector');
    const rows = await selector.elements('a.item');
    let count = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // eslint-disable-next-line no-await-in-loop
      const attr = await row.getAttribute('hidden');
      if (attr === null) {
        count++;
      }
    }
    return count;
  }
}
