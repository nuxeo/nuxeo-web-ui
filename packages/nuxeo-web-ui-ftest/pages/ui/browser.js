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
    const page = fixtures.layouts.page[docType] || 'nuxeo-document-page';
    if (page === 'nuxeo-collapsible-document-page') {
      return new CollapsibleDocumentPage(page, docType);
    }
    return new DocumentPage(page, docType);
  }

  async browseTo(path) {
    await url(`#!/browse${path}`);
    await this.waitForVisible();
    this.breadcrumb.then(async (breadcrum) => {
      await breadcrum.waitForVisible();
      this.currentPage.then(async (pageName) => {
        await pageName.waitForVisible();
      });
    });
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
    const pill = this.el.$('#documentViewsItems nuxeo-page-item.iron-selected');
    return new Results(`#nxContent [name='${pill.getAttribute('name')}']`);
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
    return this.currentPage.$('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
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
          timeoutMsg: '=========================rows not found!!==================',
        },
      );
      return rowsTemp;
    })();
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

  clickChild(title) {
    this.waitForChildren();
    return this.rows.some((row) => {
      if (
        row.isVisible('nuxeo-data-table-cell a.title') &&
        row.getText('nuxeo-data-table-cell a.title').trim() === title
      ) {
        row.click();
        return true;
      }
      return false;
    });
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
  waitForNbChildren(nb) {
    driver.waitUntil(() => {
      let count = 0;
      try {
        const { rows } = this;
        rows.forEach((row) => {
          if (row.isVisible() && row.isVisible('nuxeo-data-table-cell a.title')) {
            count++;
          }
        });
        return count === nb;
      } catch (e) {
        // prevent stale row from breaking execution
        return false;
      }
    });
  }

  async selectAllChildDocuments() {
    await this.waitForChildren();
    const rows = await this.rows;
    rows.forEach(async (row) => {
      if (await row.isVisible('nuxeo-data-table-checkbox')) {
        const currentRow = await row.$('nuxeo-data-table-checkbox');
        currentRow.click();
      }
    });
  }

  selectAllDocuments() {
    this.waitForChildren();
    const { header } = this;
    if (header.isVisible('nuxeo-data-table-checkbox')) {
      header.element('nuxeo-data-table-checkbox').click();
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
    return this.el.$('nuxeo-publication-info-bar');
  }

  get selectionToolbar() {
    return (async () => {
      const currentPage = await this.currentPage;
      const tagName = await currentPage.getTagName();
      return new Selection(`${tagName} nuxeo-selection-toolbar#toolbar`);
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

  clickDocumentActionMenu(selector) {
    clickActionMenu(this.el.element('nuxeo-actions-menu'), selector);
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

    const found = await rowTemp.map(async (row, index) => {
      const isCheckedVisible = await row.isVisible('nuxeo-data-table-checkbox[checked]');
      const isNotCheckedVisible = await row.isVisible('nuxeo-data-table-checkbox:not([checked])');
      if (deselect ? isCheckedVisible : isNotCheckedVisible && elementTitle[index].trim() === title) {
        const currentRow = await row.$('nuxeo-data-table-checkbox');
        await currentRow.click();
        return true;
      }
      return false;
    });
    if (found.length === 0) {
      throw new Error(`Cannot find document with title "${title}"`);
    }
  }

  get publishDialog() {
    clickActionMenu(this.el, 'nuxeo-publish-button');
    const publishDialog = new PublicationDialog('#publishDialog');
    publishDialog.waitForVisible();
    return publishDialog;
  }

  get comparePage() {
    return this.el.$('nuxeo-diff-page div.header');
  }
}
