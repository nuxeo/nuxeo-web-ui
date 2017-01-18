'use strict';

import DocumentContent from './browser/document_content';
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
    driver.waitForVisible(`nuxeo-add-to-collection-button #dialog`);
    this.page.element(`nuxeo-add-to-collection-button #dialog nuxeo-select2 a.select2-choice`).click();
    driver.waitForVisible(`#s2id_autogen1_search`);
    driver.element(`#s2id_autogen1_search`).setValue(name);
    driver.waitForVisible(`#select2-drop li.select2-result`);
    driver.element(`#select2-drop li.select2-result`).click();
    this.page.waitForEnabled(`nuxeo-add-to-collection-button #dialog paper-button[name="add"]`);
    this.page.element(`nuxeo-add-to-collection-button #dialog paper-button[name="add"]`).click();
    this.page.waitForVisible(`nuxeo-document-collections nuxeo-tag`);
  }

  hasCollection(name, reverse) {
    let page = this.page;
    driver.waitUntil(function () {
      let collections = page.elements(`nuxeo-document-collections nuxeo-tag`).value;
      if (reverse) {
        return collections.every((collection) => collection.getText().trim() !== name);
      } else {
        return collections.some((collection) => collection.getText().trim() === name);
      }
    }.bind(this), `The document does not belong to the collection`);
    return true;
  }

  removeFromCollection(name) {
    let page = this.page;
    let collections = this.page.elements(`nuxeo-document-collections nuxeo-tag`).value;
    collections.some((collection) => {
      if (collection.getText().trim() === name) {
        driver.waitUntil(function() {
          try {
            collection.click(`nuxeo-tag iron-icon[name="remove"]`);
            return true;
          } catch(e) {
            return this.doNotHaveCollection(name);
          }
        }.bind(this), 'Could not remove collection.');
        return true;
      }
      return false;
    });
  }

  get isFavorite() {
    this.page.waitForExist(`nuxeo-favorites-toggle-button[favorite]`);
    return true;
  }

  addToFavorites(doc) {
    this.page.click(`nuxeo-favorites-toggle-button`);
    return this.isFavorite;
  }

}
