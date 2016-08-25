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

  get documentContent() {
    return new DocumentContent('nuxeo-document-content-view');
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
    const texts = this.breadcrumb.getText('a span'); //driver.getText('nuxeo-breadcrumb a span');
    return Array.isArray(texts) ? texts.pop() : texts;
  }

  _section(name) {
    return this.page.element(`iron-pages section[name='${name}']`);
  }
}
