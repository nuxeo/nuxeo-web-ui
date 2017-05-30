'use strict';

import BasePage from '../base';
import DocumentPage from './browser/document_page';
import DocumentPermissions from './browser/document_permissions';

export default class Browser extends BasePage {

  documentPage(docType) {
    return new DocumentPage('nuxeo-document-page', docType);
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
    return this.el.element('///nuxeo-page-item[@name="permissions"]');
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

  addToCollection(name) {
    this.el.element(`nuxeo-add-to-collection-button paper-icon-button`).click();
    driver.waitForVisible(`#dialog nuxeo-select2 a.select2-choice`);
    driver.element(`#dialog nuxeo-select2 a.select2-choice`).click();
    driver.waitForVisible(`#select2-drop .select2-search input`);
    driver.element(`#select2-drop .select2-search input`).setValue(name);
    driver.waitForVisible(`#select2-drop li.select2-result`);
    driver.element(`#select2-drop li.select2-result`).click();
    driver.waitForEnabled(`#dialog paper-button[name="add"]`);
    driver.element(`#dialog paper-button[name="add"]`).click();
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
        const collections = page.elements(`nuxeo-document-collections nuxeo-tag`).value;
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
        collection.waitForVisible(`nuxeo-tag iron-icon[name="remove"]`);
        driver.waitUntil(() => {
          collection.click(`nuxeo-tag iron-icon[name="remove"]`);
          return true;
        }, 'Could not remove collection.');
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

}
