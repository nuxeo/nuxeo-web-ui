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
    return(async()=>{
     const ele = await this.el;
     const pill = await ele.$('#documentViewsItems nuxeo-page-item.iron-selected');
     const name = await pill.getAttribute('name')
     const newRes = await new Results(`#nxContent [name=${name}]`);
     return newRes;
    })()
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

  _section(name) {
    return this.el.$(`#nxContent [name='${name}']`);
  }

  get editButton() {
    return this.el.$('#edit-button');
  }

  editForm(docType) {
    return new DocumentFormLayout('#edit-dialog nuxeo-document-form-layout', docType, 'edit');
  }

  get header() {
    return (async () => {
      const currentPage = await this.currentPage;
      const ele = await currentPage.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
      return ele;
    })();
  }

  get rows() {
    return this.currentPage.then(async (rowName) => {
      rowName.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
      const rowsTemp = await rowName.elements('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
      return rowsTemp;
    });
  }

  async waitForChildren() {
    await this.currentPage.then(async (pageName) => {
      await pageName.$('nuxeo-data-table[name="table"] nuxeo-data-table-row nuxeo-data-table-checkbox');
    });
  }

  addToCollection(name) {
    const button = this.el.$('nuxeo-add-to-collection-button');
    button.waitForVisible();
    if (!button.isExisting('#dialog') || !button.isVisible('#dialog')) {
      button.click();
    }
    const dialog = new AddToCollectionDialog(`${this._selector}  nuxeo-add-to-collection-button #dialog`);
    dialog.waitForVisible();
    dialog.addToCollection(name);
    this.el.waitForVisible('nuxeo-document-collections nuxeo-tag');
  }

  doesNotHaveCollection(name) {
    const page = this.el;
    driver.waitUntil(() => {
      if (!driver.isExisting('nuxeo-document-collections')) {
        return true;
      }
      try {
        const collections = page.elements('nuxeo-document-collections nuxeo-tag');
        return collections.every((collection) => collection.getText().trim() !== name);
      } catch (e) {
        return false;
      }
    }, 'The document does belong to the collection');
    return true;
  }

  hasCollection(name) {
    const page = this.el;
    driver.waitUntil(() => {
      if (!driver.isExisting('nuxeo-document-collections')) {
        return false;
      }
      try {
        const collections = page.elements('nuxeo-document-collections nuxeo-tag a');
        return collections.some((collection) => collection.getText().trim() === name);
      } catch (e) {
        return false;
      }
    }, 'The document does not belong to the collection');
    return true;
  }

  removeFromCollection(name) {
    const { el } = this;
    el.waitForVisible('nuxeo-document-collections nuxeo-tag');
    const collections = this.el.$$('nuxeo-document-collections nuxeo-tag');
    collections.some((collection) => {
      if (collection.getText().trim() === name) {
        const remove = collection.$('iron-icon[name="remove"]');
        remove.waitForVisible();
        remove.scrollIntoView();
        remove.click();
        return true;
      }
      return false;
    });
  }

  removeSelectionFromCollection() {
    const button = this.el.$('nuxeo-collection-remove-action');
    button.waitForVisible();
    button.click();
  }

  get isFavorite() {
    this.el.waitForExist('nuxeo-favorites-toggle-button[favorite]');
    return true;
  }

  addToFavorites() {
    this.el.click('nuxeo-favorites-toggle-button');
    return this.isFavorite;
  }

  hasTitle(title) {
    return (async () => {
      const breadcrumb = await $('.breadcrumb-item-current');
      driver.waitUntil(async () => {
        const breadcrumbText = await breadcrumb.getText();
        return breadcrumbText.trim() === title;
      }, 'The document does not have such title');
      return true;
    })();
  }

  waitForHasChild(doc) {
    const { el } = this;
    el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
    const titles = el.$$('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
    return titles.some((title) => title.getText().trim() === doc.title);
  }

  async clickChild(title) {
    await this.waitForChildren();
    const rowsTemp = await this.rows;
    for (let i = 0; i < rowsTemp.length; i++) {
      const row = await rowsTemp[i].$('nuxeo-data-table-cell a.title');
      const isRowVisible = await row.isVisible();
      const rowText = await row.getText();
      if (isRowVisible && rowText.trim() === title) {
        await row.click();
        return true;
      }
    }
    return false;
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

  selectAllChildDocuments() {
    this.waitForChildren();
    this.rows.forEach((row) => {
      if (row.isVisible('nuxeo-data-table-checkbox')) {
        row.$('nuxeo-data-table-checkbox').click();
      }
    });
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

  deselectChildDocument(title) {
    return this._selectChildDocument(title, true);
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

  startWorkflow(workflow) {
    // click the action to trigger the dialog
    clickActionMenu(this.el, 'nuxeo-workflow-button');
    // select the workflow
    const workflowSelect = this.el.$('.document-actions nuxeo-workflow-button nuxeo-select');
    workflowSelect.waitForVisible();
    fixtures.layouts.setValue(workflowSelect, workflow);
    // click the start button
    this.el.$('.document-actions nuxeo-workflow-button #startButton').click();
  }

  async _selectChildDocument(title, deselect) {
    const rowTemp = await this.rows;
    const elementTitle = await browser
      .$$('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])')
      .map((img) => img.$('nuxeo-data-table-cell a.title').getText());

    const index = await elementTitle.findIndex((currenTitle) => currenTitle === title);
    const isCheckedVisible = await rowTemp[index].isVisible('nuxeo-data-table-checkbox[checked]');
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
