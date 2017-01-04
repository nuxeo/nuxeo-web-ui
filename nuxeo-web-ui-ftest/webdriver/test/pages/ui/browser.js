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
}
