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
  documentPage(docType) {
    const page = fixtures.layouts.page[docType] || 'nuxeo-document-page';
    if (page === 'nuxeo-collapsible-document-page') {
      return new CollapsibleDocumentPage(page, docType);
    }
    return new DocumentPage(page, docType);
  }

  browseTo(path) {
    url(`#!/browse${path}`);
    this.waitForVisible();
    this.breadcrumb.waitForVisible();
    this.currentPage.waitForVisible();
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
    return this.el.element('nuxeo-page-item[name="permissions"]');
  }

  get publicationView() {
    return new DocumentPublications('nuxeo-browser nuxeo-document-publications');
  }

  get publicationViewButton() {
    return this.el.element('nuxeo-page-item[name="publication"]');
  }

  get documentTaskView() {
    return new DocumentTask('nuxeo-document-task');
  }

  get currentPageName() {
    // get selected pill to get it's name
    this.waitForVisible('#documentViewsItems nuxeo-page-item.iron-selected');
    const pill = this.el.element('#documentViewsItems nuxeo-page-item.iron-selected');
    // get active page name
    return pill.getAttribute('name');
  }

  get currentPage() {
    return this._section(this.currentPageName);
  }

  /**
   * Gets a Results page helper, assuming current visible page has a <nuxeo-results> in there.
   */
  get results() {
    const pill = this.el.element('#documentViewsItems nuxeo-page-item.iron-selected');
    return new Results(`#nxContent [name='${pill.getAttribute('name')}']`);
  }

  get breadcrumb() {
    return this.el.element('nuxeo-breadcrumb');
  }

  get title() {
    return this.breadcrumb.getText('.breadcrumb-item-current');
  }

  _section(name) {
    return this.el.element(`#nxContent [name='${name}']`);
  }

  get editButton() {
    return this.el.element('#edit-button');
  }

  editForm(docType) {
    return new DocumentFormLayout('#edit-dialog nuxeo-document-form-layout', docType, 'edit');
  }

  get header() {
    return this.currentPage.element('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
  }

  get rows() {
    return this.currentPage.elements('nuxeo-data-table[name="table"] nuxeo-data-table-row:not([header])');
  }

  waitForChildren() {
    this.currentPage.waitForExist('nuxeo-data-table[name="table"] nuxeo-data-table-row nuxeo-data-table-checkbox');
  }

  addToCollection(name) {
    const button = this.el.element('nuxeo-add-to-collection-button');
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
    const collections = this.el.elements('nuxeo-document-collections nuxeo-tag');
    collections.some((collection) => {
      if (collection.getText().trim() === name) {
        const remove = collection.element('iron-icon[name="remove"]');
        remove.waitForVisible();
        remove.scrollIntoView();
        remove.click();
        return true;
      }
      return false;
    });
  }

  removeSelectionFromCollection() {
    const button = this.el.element('nuxeo-collection-remove-action');
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
    $('.breadcrumb-item-current').waitForVisible();
    driver.waitUntil(
      () =>
        $('.breadcrumb-item-current')
          .getText()
          .trim() === title,
      'The document does not have such title',
    );
    return true;
  }

  waitForHasChild(doc) {
    const { el } = this;
    el.waitForVisible('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
    const titles = el.elements('nuxeo-data-table[name="table"] nuxeo-data-table-row a.title');
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

  indexOfChild(title) {
    this.waitForChildren();
    const { rows } = this;
    let i;
    for (i = 0; i < rows.length; i++) {
      if (
        rows[i]
          .element('nuxeo-data-table-cell a.title')
          .getText()
          .trim() === title
      ) {
        return i;
      }
    }
    return -1;
  }

  sortContent(field, order) {
    driver.waitUntil(() => {
      this.waitForChildren();
      const columns = this.currentPage.elements('nuxeo-data-table[name="table"] nuxeo-data-table-column');
      const idx = columns
        .map((col) => browser.execute((el) => el.sortBy, col))
        .findIndex((colSortByField) => colSortByField && colSortByField.toLowerCase() === field.toLowerCase());
      if (idx === -1) {
        throw new Error('Field not found');
      }
      const header = this.currentPage.element('nuxeo-data-table[name="table"] nuxeo-data-table-row[header]');
      const sortElt = header.element(`nuxeo-data-table-cell:nth-of-type(${idx + 1}) nuxeo-data-table-column-sort`);
      const currentSorting = sortElt.element('paper-icon-button').getAttribute('direction');
      if (currentSorting && order.toLowerCase() === currentSorting.toLowerCase()) {
        return true;
      }
      sortElt.click();
      return false;
    });
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

  selectAllChildDocuments() {
    this.waitForChildren();
    this.rows.forEach((row) => {
      if (row.isVisible('nuxeo-data-table-checkbox')) {
        row.element('nuxeo-data-table-checkbox').click();
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

  selectChildDocument(title) {
    return this._selectChildDocument(title);
  }

  deselectChildDocument(title) {
    return this._selectChildDocument(title, true);
  }

  get publicationInfobar() {
    return this.el.element('nuxeo-publication-info-bar');
  }

  get selectionToolbar() {
    return new Selection(`${this.currentPage.getTagName()} nuxeo-selection-toolbar#toolbar`);
  }

  get trashedInfobar() {
    return this.el.element('#trashedInfoBar');
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
    return this.el.element('.document-actions nuxeo-workflow-button #startButton');
  }

  clickDocumentActionMenu(selector) {
    clickActionMenu(this.el.element('nuxeo-actions-menu'), selector);
  }

  startWorkflow(workflow) {
    // click the action to trigger the dialog
    clickActionMenu(this.el, 'nuxeo-workflow-button');
    // select the workflow
    const workflowSelect = this.el.element('.document-actions nuxeo-workflow-button nuxeo-select');
    workflowSelect.waitForVisible();
    fixtures.layouts.setValue(workflowSelect, workflow);
    // click the start button
    this.el.element('.document-actions nuxeo-workflow-button #startButton').click();
  }

  _selectChildDocument(title, deselect) {
    const found = this.rows.some((row) => {
      if (
        (deselect
          ? row.isVisible('nuxeo-data-table-checkbox[checked]')
          : row.isVisible('nuxeo-data-table-checkbox:not([checked])')) &&
        row.getText('nuxeo-data-table-cell a.title').trim() === title
      ) {
        row.element('nuxeo-data-table-checkbox').click();
        return true;
      }
      return false;
    });
    if (!found) {
      throw new Error(`Cannot find document with title "${title}"`);
    }
  }

  get publishDialog() {
    clickActionMenu(this.el, 'nuxeo-publish-button');
    const publishDialog = new PublicationDialog('#publishDialog');
    publishDialog.waitForVisible();
    return publishDialog;
  }
}
