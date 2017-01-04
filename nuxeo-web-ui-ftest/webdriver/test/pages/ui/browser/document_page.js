'use strict';

import DocumentEdit from './document_edit';

export default class DocumentPage {

  constructor(selector, docType) {
    this.docType = docType;
    this.page = driver.element(selector);
  }

  get view() {
    return driver.element(`nuxeo-${this.docType.toLowerCase()}-view-layout`);
  }

  get edit() {
    return new DocumentEdit(this.metadata.element(`nuxeo-${this.docType.toLowerCase()}-edit-layout`));
  }

  get metadata() {
    return this.page.element('nuxeo-document-metadata');
  }
}
