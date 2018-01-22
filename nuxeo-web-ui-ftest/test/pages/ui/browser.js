'use strict';

import BasePage from '../base';
import DocumentPage from './browser/document_page';
import CollapsibleDocumentPage from './browser/collapsible_document_page';
import DocumentPermissions from './browser/document_permissions';
import EditDialog from './edit_dialog';
import Selection from './selection';

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
    return new DocumentPermissions('nuxeo-document-permissions');
  }

  get permissionsViewButton() {
    return this.el.element('nuxeo-page-item[name="permissions"]');
  }

  get breadcrumb() {
    return this.el.element('nuxeo-breadcrumb');
  }

  get title() {
    return this.breadcrumb.getText('.breadcrumb-item-current');
  }

  _section(name) {
    return this.el.element(`iron-pages section[name='${name}']`);
  }

  get editButton() {
    return this.el.element('#edit');
  }

  get editDialog() {
    return new EditDialog('#edit-dialog');
  }

  addToCollection(name) {
    this.el.element(`nuxeo-add-to-collection-button paper-icon-button`).click();
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

  get selectionToolbar() {
    return new Selection('nuxeo-selection-toolbar#toolbar');
  }

}
