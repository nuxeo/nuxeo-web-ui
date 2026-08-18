import Results from './results.js';
import DocumentPermissions from './browser/document_permissions.js';

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
      return ele.element('.selectivity-single-select');
    })();
  }

  get nuxeoSelect() {
    return (async () => {
      const ele = await this.el;
      return ele.element('#actionsDropdown');
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
      const rowTitles = await driver.$$('nuxeo-saved-search-actions paper-item').map((img) => img.getText());
      const index = rowTitles.findIndex((currenTitle) => currenTitle === 'Share');
      const result = await buttons[index];
      return result;
    })();
  }

  get permissionsView() {
    return new DocumentPermissions(`${this._selector} nuxeo-document-permissions`);
  }

  async isSavedSearchSelected(savedSearchName) {
    const ele = await this.el;

    // Look for the visible selected value rendered by selectivity
    const valueEl = await ele.$('.selectivity-single-select .value');

    await valueEl.waitForDisplayed();

    const text = await valueEl.getText();

    return text.trim() === savedSearchName;
  }

  async getSavedSearch(savedSearchName) {
    const selector = await this._selector;

    // <nuxeo-search>
    const root = await $(selector);

    // step 1: wait for dropdown host
    const actionsDropdown = await root.shadow$('#actionsDropdown');
    await actionsDropdown.waitForExist();

    // step 2: wait for its internal shadow to render
    await browser.waitUntil(
      async () => {
        const container = await actionsDropdown.shadow$('div.selectivity-single-select');
        return container.isExisting();
      },
      {
        timeout: 5000,
      },
    );

    // step 3: now wait for items inside the shadow DOM
    await browser.waitUntil(
      async () => {
        const items = await actionsDropdown.shadow$$('div.selectivity-result-item');
        return items.length > 0;
      },
      {
        timeout: 5000,
      },
    );

    // step 4: finally read them
    const items = await actionsDropdown.shadow$$('div.selectivity-result-item');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Read via textContent: on newer Chrome getText() returns '' for these shadow-DOM dropdown
      // items when they are not laid out on screen, so the name match would silently never hit.
      // eslint-disable-next-line no-await-in-loop
      const text = await browser.execute((el) => el.textContent, item);
      // eslint-disable-next-line no-await-in-loop
      const className = await item.getAttribute('class');

      if ((text || '').trim() === savedSearchName && className.includes('highlight')) {
        return item;
      }
    }

    return undefined;
  }

  async enterInput(text) {
    const isInputEntered = await driver.keys(text);
    return isInputEntered;
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
