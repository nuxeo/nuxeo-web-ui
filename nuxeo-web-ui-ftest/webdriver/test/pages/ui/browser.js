'use strict';

import DocumentPage from './browser/document_page';

export default class Browser {

  constructor(selector) {
    this._selector = selector;
  }

  get page() {
    return driver.element(this._selector);
  }

  documentPage(docType) {
    return new DocumentPage('nuxeo-document-page', docType);
  }

  get view() {
    return this._section('view');
  }

  get permissions() {
    return this._section('permissions').element('nuxeo-document-permissions');
  }

  get breadcrumb() {
    return this.page.element('nuxeo-breadcrumb');
  }

  get title() {
    return this.breadcrumb.getText('.breadcrumb-item-current');
  }

  _section(name) {
    return this.page.element(`iron-pages section[name='${name}']`);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  addToCollection(name) {
    this.page.element(`nuxeo-add-to-collection-button paper-icon-button`).click();
    driver.waitForVisible(`#dialog nuxeo-select2 a.select2-choice`);
    driver.element(`#dialog nuxeo-select2 a.select2-choice`).click();
    driver.waitForVisible(`#select2-drop .select2-search input`);
    driver.element(`#select2-drop .select2-search input`).setValue(name);
    driver.waitForVisible(`#select2-drop li.select2-result`);
    driver.element(`#select2-drop li.select2-result`).click();
    driver.waitForEnabled(`#dialog paper-button[name="add"]`);
    driver.element(`#dialog paper-button[name="add"]`).click();
    this.page.waitForVisible(`nuxeo-document-collections nuxeo-tag`);
  }

  hasCollection(name, reverse) {
    const page = this.page;
    driver.waitUntil(() => {
      const collections = page.elements(`nuxeo-document-collections nuxeo-tag`).value;
      return reverse ? collections.every((collection) => collection.getText().trim() !== name)
        : collections.some((collection) => collection.getText().trim() === name);
    }, `The document does not belong to the collection`);
    return true;
  }

  removeFromCollection(name) {
    const collections = this.page.elements(`nuxeo-document-collections nuxeo-tag`).value;
    collections.some((collection) => {
      if (collection.getText().trim() === name) {
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
    this.page.waitForExist(`nuxeo-favorites-toggle-button[favorite]`);
    return true;
  }

  addToFavorites() {
    this.page.click(`nuxeo-favorites-toggle-button`);
    return this.isFavorite;
  }

  hasTitle(title) {
    driver.waitUntil(
      () => driver.getText('.breadcrumb-item-current').trim() === title,
      `The document does not have such title`
    );
    return true;
  }

}
