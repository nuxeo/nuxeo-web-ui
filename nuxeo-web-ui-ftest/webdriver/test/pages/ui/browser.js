'use strict';

import DocumentContent from './browser/document_content';
import DocumentPage from './browser/document_page';

export default class Browser {

  constructor(selector) {
    this.page = driver.element(selector);
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

  get breadcumb() {
    this.page.element('nuxeo-breadcrumb');
  }

  get title() {
    // XXX: this.breadcrumb.getText('a span'); not working with waitUntil
    return this.page.getText('nuxeo-breadcrumb .current');
  }

  _section(name) {
    return this.page.element(`iron-pages section[name='${name}']`);
  }

  addToCollection(name) {
    this.page.element(`nuxeo-add-to-collection-button paper-icon-button`).click();
    driver.waitForVisible(`nuxeo-add-to-collection-button #dialog`);
    this.page.element(`nuxeo-add-to-collection-button #dialog nuxeo-select2 a.select2-choice`).click();
    driver.waitForVisible(`#s2id_autogen1_search`);
    driver.element(`#s2id_autogen1_search`).setValue(name);
    driver.waitForVisible(`#select2-drop li.select2-result`);
    driver.element(`#select2-drop li.select2-result`).click();
    this.page.element(`nuxeo-add-to-collection-button #dialog paper-button[name="add"]`).click();
    this.page.waitForVisible(`nuxeo-document-collections nuxeo-tag`);
  }

  hasCollection(name) {
    driver.waitUntil(function () {
      try {
        let collections = this.page.getText(`nuxeo-document-collections nuxeo-tag`);
        if (Array.isArray(collections)) {
          return collections.some((txt) => txt.trim() === name);
        } else {
         return collections.trim() === name;
        }
        return true;
      } catch(e) {
        return false;
      }
    }.bind(this), 5000, `The document does not belong to the collection`);
    return true;
  }

  doNotHaveCollection(name) {
    driver.waitUntil(function () {
      try {
        try {
          if (!this.page.isExisting(`nuxeo-document-collections nuxeo-tag`)) {
            return true;
          }
        } catch(e) {
          if (e instanceof NoSuchElement) {
            return true;
          }
          console.warn(e);
          return false;
        }
        let collections = this.page.getText(`nuxeo-document-collections nuxeo-tag`);
        if (Array.isArray(collections)) {
          return collections.every((txt) => txt.trim() !== name);
        } else if (collections) {
          return collections.trim() !== name;
        } else {
          return true;
        }
        return true;
      } catch(e) {
        return false;
      }
    }.bind(this), 5000, `The document does belong to the collection`);
    return true;
  }

  removeFromCollection(name) {
    let collections = this.page.getText(`nuxeo-document-collections nuxeo-tag`);
    if (Array.isArray(collections)) {
      return collections.some((txt, index) => {
        if (txt.trim() === name) {
          this.page.waitForVisible(`nuxeo-document-collections nuxeo-tag iron-icon[name="remove"]`);
          this.page.element(`nuxeo-document-collections nuxeo-tag iron-icon[name="remove"]`)[index].click();
          driver.waitUntil(function () {
            return !this.hasCollection(name);
          });
          return true;
        }
        return false;
      });
    } else {
       driver.waitUntil(function () {
         try {
           this.page.click(`nuxeo-document-collections nuxeo-tag iron-icon[name="remove"]`)
           return true;
         } catch(e) {
           return false;
         }
       }.bind(this), 5000);
       driver.waitUntil(function () {
         return this.doNotHaveCollection(name);
       }.bind(this));
       return true;
    }
  }

}
