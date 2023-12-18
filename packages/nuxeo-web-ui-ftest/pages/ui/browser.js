/* eslint-disable no-await-in-loop */
import BasePage from '../base';
import DocumentPage from './browser/document_page';
import CollapsibleDocumentPage from './browser/collapsible_document_page';
import AddToCollectionDialog from './browser/add_to_collection_dialog';
import PublicationDialog from './browser/publication_dialog';
import DocumentPermissions from './browser/document_permissions';
import DocumentPublications from './browser/document_publications';
import DocumentTask from './browser/document_task';
import DocumentFormLayout from './browser/document_form_layout';
import Selection from './selection';
import Results from './results';
import { clickActionMenu, url } from '../helpers';

export default class Browser extends BasePage {
  async documentPage(docType) {
    const page = (await fixtures.layouts.page[docType]) || 'nuxeo-document-page';
    if (page === 'nuxeo-collapsible-document-page') {
      return new CollapsibleDocumentPage(page, docType);
    }
    return new DocumentPage(page, docType);
  }

  async browseTo(path) {
    await url(`#!/browse${path}`);
    await this.waitForVisible();
    const breadcrumb = await this.breadcrumb;
    await breadcrumb.waitForVisible();
    const currentPage = await this.currentPage;
    await currentPage.waitForVisible();
  }

  get view() {
    return this._section('view');
  }

  get permissions() {
    return this._section('permissions').element('nuxeo-document-permissions');
  }

  get permissionsView() {
    return new DocumentPermissions('nuxeo-browser nuxeo-document-permissions');
  }

  get permissionsViewButton() {
    return this.el.$('nuxeo-page-item[name="permissions"]');
  }

  get publicationView() {
    return new DocumentPublications('nuxeo-browser nuxeo-document-publications');
  }

  get publicationViewButton() {
    return this.el.$('nuxeo-page-item[name="publication"]');
  }

  get documentTaskView() {
    return new DocumentTask('nuxeo-document-task');
  }

  get currentPageName() {
    return (async () => {
      // get selected pill to get it's name
      await $('#documentViewsItems nuxeo-page-item.iron-selected').waitForVisible();
      const pill = await this.el.element('#documentViewsItems nuxeo-page-item.iron-selected');
      return pill.getAttribute('name');
    })();
  }

  get currentPage() {
    return (async () => {
      const section = await this._section(await this.currentPageName);
      return section;
    })();
  }

  /**
   * Gets a Results page helper, assuming current visible page has a <nuxeo-results> in there.
   */
  get results() {
    return (async () => {
      const ele = await this.el;
      const pill = await ele.$('#documentViewsItems nuxeo-page-item.iron-selected');
      const getAttributeName = await pill.getAttribute('name');
      const getViewElement = await new Results(`#nxContent [name=${getAttributeName}]`);
      return getViewElement;
    })();
  }

  get breadcrumb() {
    return (async () => {
      const element = await this.el.element('nuxeo-breadcrumb');
      return element;
    })();
  }

  get title() {
    return this.breadcrumb.getText('.breadcrumb-item-current');
  }

  async _section(name) {
    const nxname = await this.el.$(`#nxContent [name='${name}']`);
    return nxname;
  }

  get editButton() {
    return (async () => {
      const editButton = await this.el.$('#edit-button');
      return editButton;
    })();
  }

  async editForm(docType) {
    const docFormLayout = await new DocumentFormLayout('#edit-dialog nuxeo-document-form-layout', docType, 'edit');
    return docFormLayout;
  }

  get header() {
    return (async () => {
      const currentPage = await this.currentPage;
      const ele = await currentPage.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
      return ele;
    })();
  }

  get rows() {
    return (async () => {
      const currentPage = await this.currentPage;
      await currentPage.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
      let rowsTemp;
      await driver.waitUntil(
        async () => {
          rowsTemp = await currentPage.elements('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
          return rowsTemp.length > 0;
        },
        {
          timeout: 10000,
          timeoutMsg: 'rows not found!!',
        },
      );
      return rowsTemp;
    })();
  }

  async waitForChildren() {
    const currentPage = await this.currentPage;
    const ele = await currentPage.$('nuxeo-data-table[name="table"] nuxeo-data-table-row nuxeo-data-table-checkbox');
    await ele.waitForExist();
  }

  async addToCollection(name) {
    const button = await this.el.$('nuxeo-add-to-collection-button');
    await button.waitForVisible();
    const dialogExistingEle = await button.isExisting('#dialog');
    const dialogVisibleEle = await button.isVisible('#dialog');
    if (!dialogExistingEle || !dialogVisibleEle) {
      await button.click();
    }
    const dialog = await new AddToCollectionDialog(`${this._selector}  nuxeo-add-to-collection-button #dialog`);
    await dialog.waitForVisible();
    await dialog.addToCollection(name);
    const docCollectionEle = await this.el.$('nuxeo-document-collections nuxeo-tag');
    await docCollectionEle.waitForVisible();
  }

  async doesNotHaveCollection(name) {
    const page = this.el;
    const nuxeoDocEle = await driver.isExisting('nuxeo-document-collections');
    if (!nuxeoDocEle) {
      return true;
    }
    try {
      const collections = await page.elements('nuxeo-document-collections nuxeo-tag');
      for (let i = 0; i < collections.length; i++) {
        const collection = await collections[i];
        const getTextEle = await collection.getText();
        if (getTextEle.trim() !== name) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasCollection(name) {
    const page = await this.el;
    const docCollection = await driver.isExisting('nuxeo-document-collections');
    if (!docCollection) {
      return false;
    }
    try {
      const collections = await page.$$('nuxeo-document-collections nuxeo-tag a');
      for (let i = 0; i < collections.length; i++) {
        const collection = await collections[i];
        const getTextEle = await collection.getText();
        if (getTextEle.trim() === name) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async removeFromCollection(name) {
    const { el } = await this;
    await el.$('nuxeo-document-collections nuxeo-tag').waitForVisible();
    const collections = await this.el.$$('nuxeo-document-collections nuxeo-tag');
    let found = false;
    for (let index = 0; index < collections.length; index++) {
      const collectionText = await collections[index].getText();
      if (collectionText.trim() === name) {
        const remove = await collections[index].$('iron-icon[name="remove"]');
        await remove.waitForVisible();
        await remove.scrollIntoView();
        await remove.click();
        found = true;
      }
      return false;
    }
    return found;
  }

  async removeSelectionFromCollection() {
    const button = await this.el.$('nuxeo-collection-remove-action');
    await button.waitForVisible();
    await button.click();
  }

  get isFavorite() {
    return (async () => {
      await this.el.waitForExist('nuxeo-favorites-toggle-button[favorite]');
      return true;
    })();
  }

  async addToFavorites() {
    await this.el.$('nuxeo-favorites-toggle-button').click();
    const fav = await this.isFavorite;
    return fav;
  }

  hasTitle(title) {
    return (async () => {
      await driver.pause(1000);
      const breadcrumb = await $('.breadcrumb-item-current');
      const breadcrumbText = await breadcrumb.getText();
      if (breadcrumbText.trim() === title) {
        return true;
      }
      return false;
    })();
  }

  async waitForHasChild(doc) {
    const { el } = this;
    const dataTable = await el.$('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
    await dataTable.waitForVisible();
    const titles = await el.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
    for (let i = 0; i < titles.length; i++) {
      const row = await titles[i].getText();
      if (row.trim() === doc.title) {
        return true;
      }
    }
    return false;
  }

  async clickChild(title) {
    await this.waitForChildren();
    const rowTemp = await this.rows;
    for (let i = 0; i < rowTemp.length; i++) {
      const row = rowTemp[i];
      const rowEl = await row.$('nuxeo-data-table-cell a.title');
      const rowVisible = await rowEl.isVisible();
      const getText = await rowEl.getText();
      const rowText = (await getText.trim()) === title;
      if (rowVisible && rowText) {
        await row.click();
        break; // Exit the loop once a match is found
      }
    }
  }

  async indexOfChild(title) {
    await this.waitForChildren();
    const elementTitle = await browser
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell a.title').getText());

    let i;
    for (i = 0; i < elementTitle.length; i++) {
      if (elementTitle[i].trim() === title) {
        return i;
      }
    }
    return -1;
  }

  async sortContent(field, order) {
    try {
      await this.waitForChildren();
      const currentPage = await this.currentPage;
      const idx = await currentPage
        .$$('nuxeo-data-table[name="table"] nuxeo-data-table-column')
        .map((col) => browser.execute((el) => el.sortBy, col));
      const columnIndex = idx.findIndex((colSortByField) => {
        const sortByColumn = colSortByField;
        return sortByColumn && sortByColumn.toLowerCase() === field.toLowerCase();
      });
      if (columnIndex === -1) {
        throw new Error('Field not found');
      }
      const header = await currentPage.element('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
      const sortElt = await header.$(
        `nuxeo-data-table-cell:nth-of-type(${columnIndex + 1}) nuxeo-data-table-column-sort`,
      );
      const currentSorting = await sortElt.element('paper-icon-button');
      const direction = await currentSorting.getAttribute('direction');
      if (direction && order.toLowerCase() === direction.toLowerCase()) {
        return true;
      }
      await sortElt.click();
      return false;
    } catch (error) {
      console.warn(error);
    }
  }

  /*
   * Results might vary with the viewport size as only visible items are taken into account.
   */
  async waitForNbChildren(nb) {
    let count = 0;
    try {
      const rowTemp = await this.rows;
      for (let i = 0; i < rowTemp.length; i++) {
        if ((await rowTemp[i].isVisible()) && (await rowTemp[i].isVisible('nuxeo-data-table-cell a.title'))) {
          count++;
        }
      }
      return count === nb;
    } catch (e) {
      // prevent stale row from breaking execution
      return false;
    }
  }

  async selectAllChildDocuments() {
    await this.waitForChildren();
    await driver.waitUntil(
      async () => {
        const rowWithCheckbox = await browser.$$(
          'nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header] nuxeo-data-table-checkbox',
        );
        return rowWithCheckbox.length > 0;
      },
      {
        timeout: 10000,
        timeoutMsg: 'expecteed selectAllChildDocuments',
      },
    );
    const rowTemp = await this.rows;
    for (let index = 0; index < rowTemp.length; index++) {
      const checkboxVisible = await rowTemp[index].isVisible('nuxeo-data-table-checkbox');
      if (checkboxVisible) {
        rowTemp[index].$('nuxeo-data-table-checkbox').click();
      }
    }
  }

  async selectAllDocuments() {
    await this.waitForChildren();
    const currentPage = await this.currentPage;
    const header = await currentPage.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
    const ele = await header.$('nuxeo-data-table-checkbox');
    const isHeaderVisible = await ele.isVisible();
    if (await isHeaderVisible) {
      await ele.click();
    }
  }

  async selectChildDocument(title) {
    const childDoc = await this._selectChildDocument(title);
    return childDoc;
  }

  async deselectChildDocument(title) {
    const childDoc = await this._selectChildDocument(title, true);
    return childDoc;
  }

  get publicationInfobar() {
    return (async () => {
      const ele = await this.el;
      const outElement = await ele.$('nuxeo-publication-info-bar');
      return outElement;
    })();
  }

  get selectionToolbar() {
    return (async () => {
      const currentPage = await this.currentPage;
      const tagName = await currentPage.getTagName();
      const selectionBar = await new Selection(`${tagName} nuxeo-selection-toolbar#toolbar`);
      return selectionBar;
    })();
  }

  get trashedInfobar() {
    return this.el.$('#trashedInfoBar');
  }

  get trashDocumentButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('.document-actions nuxeo-delete-document-button #deleteButton');
  }

  get untrashDocumentButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.trashedInfobar.element('nuxeo-untrash-document-button #untrashButton');
  }

  get deleteDocumentButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.trashedInfobar.element('nuxeo-delete-document-button[hard] #deleteButton');
  }

  get startWorkflowButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.$('.document-actions nuxeo-workflow-button #startButton');
  }

  async clickDocumentActionMenu(selector) {
    const ele = await this.el;
    const id = await ele.$('nuxeo-actions-menu');
    await clickActionMenu(id, selector);
  }

  async startWorkflow(workflow) {
    // click the action to trigger the dialog
    await clickActionMenu(this.el, 'nuxeo-workflow-button');
    // select the workflow
    const workflowSelect = await this.el.$('.document-actions nuxeo-workflow-button nuxeo-select');
    await workflowSelect.waitForVisible();
    await fixtures.layouts.setValue(workflowSelect, workflow);
    // click the start button
    const ele = await this.el.$('.document-actions nuxeo-workflow-button #startButton');
    await ele.click();
  }

  async _selectChildDocument(title, deselect) {
    const rowTemp = await this.rows;
    const elementTitle = await browser
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell a.title').getText());
    const nonEmptyTitles = elementTitle.filter((nonEmpty) => nonEmpty.trim() !== '');
    const index = nonEmptyTitles.findIndex((currenTitle) => currenTitle === title);
    await driver.pause(3000);
    const isCheckedVisible = await rowTemp[index].isVisible('nuxeo-data-table-checkbox[checked]');
    await driver.pause(1000);
    const isNotCheckedVisible = await rowTemp[index].isVisible('nuxeo-data-table-checkbox:not([checked])');
    if ((deselect ? isCheckedVisible : isNotCheckedVisible) && index >= 0) {
      const currentRow = await rowTemp[index].$('nuxeo-data-table-checkbox');
      await currentRow.click();
      return true;
    }
    return false;
  }

  get publishDialog() {
    return (async () => {
      const ele = await this.el;
      await clickActionMenu(ele, 'nuxeo-publish-button');
      const publishDialog = new PublicationDialog('#publishDialog');
      await publishDialog.waitForVisible();
      return publishDialog;
    })();
  }

  get comparePage() {
    return this.el.$('nuxeo-diff-page div.header');
  }
}
