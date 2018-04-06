'use strict';

import BasePage from '../base';
import DocumentPage from './browser/document_page';
import CollapsibleDocumentPage from './browser/collapsible_document_page';
import DocumentPermissions from './browser/document_permissions';
import EditDialog from './edit_dialog';
import Selection from './selection';
import Results from './results';

export default class Browser extends BasePage {

  documentPage(docType) {
    const page = fixtures.layouts.page[docType] || 'nuxeo-document-page';
    if (page === `nuxeo-collapsible-document-page`) {
      return new CollapsibleDocumentPage(page, docType);
    } else {
      return new DocumentPage(page, docType);
    }
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

  get currentPage() {
    // get selected pill to get it's name
    const pill = this.el.element('#documentViewsItems nuxeo-page-item.iron-selected');
    // get active page
    return this._section(pill.getAttribute('name'));
  }

  /**
   * Gets a Results page helper, assuming current visible page has a <nuxeo-results> in there.
   */
  get currentPageResults() {
    return new Results(`${this.currentPage.getTagName()}`);
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
    return this.el.element('#edit');
  }

  get editDialog() {
    return new EditDialog('#edit-dialog');
  }

  addToCollection(name) {
    var addToCollectionButton = this.el.element(`nuxeo-add-to-collection-button paper-icon-button`);
    addToCollectionButton.waitForVisible();
    addToCollectionButton.click();
    const selectivity = this.el.element(`#add-to-collection-dialog nuxeo-selectivity`);
    selectivity.waitForVisible();
    selectivity.waitForVisible(`#input`);
    selectivity.click(`#input`);
    selectivity.waitForVisible(`.selectivity-search-input`);
    selectivity.element(`.selectivity-search-input`).setValue(name);
    selectivity.waitForVisible(`.selectivity-result-item.highlight`);
    selectivity.click(`.selectivity-result-item.highlight`);
    driver.waitForEnabled(`#add-to-collection-dialog paper-button[name="add"]`);
    driver.click(`#add-to-collection-dialog paper-button[name="add"]`);
    this.el.waitForVisible(`nuxeo-document-collections nuxeo-tag`);
  }

  doesNotHaveCollection(name) {
    const page = this.el;
    driver.waitUntil(() => {
      if (!driver.isExisting('nuxeo-document-collections')) {
        return true;
      }
      try {
        const collections = page.elements(`nuxeo-document-collections nuxeo-tag`).value;
        return collections.every((collection) => collection.getText().trim() !== name);
      } catch (e) {
        return false;
      }
    }, `The document does belong to the collection`);
    return true;
  }

  hasCollection(name) {
    const page = this.el;
    driver.waitUntil(() => {
      if (!driver.isExisting('nuxeo-document-collections')) {
        return false;
      }
      try {
        const collections = page.elements(`nuxeo-document-collections nuxeo-tag a`).value;
        return collections.some((collection) => collection.getText().trim() === name);
      } catch (e) {
        return false;
      }
    }, `The document does not belong to the collection`);
    return true;
  }

  removeFromCollection(name) {
    const el = this.el;
    el.waitForVisible(`nuxeo-document-collections nuxeo-tag`);
    const collections = this.el.elements(`nuxeo-document-collections nuxeo-tag`).value;
    collections.some((collection) => {
      if (collection.getText().trim() === name) {
        const remove = collection.element(`iron-icon[name="remove"]`);
        remove.waitForVisible();
        this.el.scrollIntoView(`nuxeo-document-collections nuxeo-tag`);
        remove.click();
        return true;
      }
      return false;
    });
  }

  get isFavorite() {
    this.el.waitForExist(`nuxeo-favorites-toggle-button[favorite]`);
    return true;
  }

  addToFavorites() {
    this.el.click(`nuxeo-favorites-toggle-button`);
    return this.isFavorite;
  }

  hasTitle(title) {
    driver.waitForVisible('.breadcrumb-item-current');
    driver.waitUntil(
      () => driver.getText('.breadcrumb-item-current').trim() === title,
      `The document does not have such title`
    );
    return true;
  }

  waitForHasChild(doc) {
    const el = this.el;
    el.waitForVisible('nuxeo-data-table nuxeo-data-table-row a.title');
    const titles = el.elements('nuxeo-data-table nuxeo-data-table-row a.title');
    return titles.value.some((title) => title.getText().trim() === doc.title);
  }

  clickChild(doc) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row nuxeo-data-table-cell a.title');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    return rows.value.some((row) => {
      if (row.isVisible(`nuxeo-data-table-cell a.title`) &&
          row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title) {
        row.click();
        return true;
      } else {
        return false;
      }
    });
  }

  indexOfChild(title) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row nuxeo-data-table-cell a.title');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    let i;
    for (i = 0; i < rows.value.length; i++) {
      if (rows.value[i].isVisible(`nuxeo-data-table-cell a.title`) &&
          rows.value[i].getText(`nuxeo-data-table-cell a.title`).trim() === title) {
        // minus 1 because of the table header
        return i - 1;
      }
    }
    return -1;
  }

  /*
   * Results might vary with the viewport size as only visible items are taken into account.
   */
  waitForNbChildren(nb) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row');
    driver.waitUntil(() => {
      const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
      let count = 0;
      rows.value.forEach((row) => {
        if (row.isVisible() && row.isVisible(`nuxeo-data-table-cell a.title`)) {
          count++;
        }
      });
      return count === nb;
    });
  }

  selectAllChildDocuments() {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row nuxeo-data-table-checkbox');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    rows.value.forEach((row) => {
      if (row.isVisible('nuxeo-data-table-checkbox')) {
        row.element('nuxeo-data-table-checkbox').click();
      }
    });
  }

  selectChildDocument(title) {
    this.el.waitForVisible('nuxeo-data-table nuxeo-data-table-row nuxeo-data-table-checkbox');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row');
    rows.value.forEach((row) => {
      if (row.isVisible('nuxeo-data-table-checkbox') &&
          row.getText(`nuxeo-data-table-cell a.title`).trim() === title) {
        row.element('nuxeo-data-table-checkbox').click();
      }
    });
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

}
