'use strict';

import DocumentEdit from './document_edit';
import DocumentMetadata from './document_metadata';
import DocumentView from './document_view';

export default class DocumentPage {

  constructor(selector, docType) {
    this.docType = docType;
    this._selector = selector;
  }

  get page() {
    return driver.element(this._selector);
  }

  get view() {
    return new DocumentView(this.page.element(`nuxeo-document-view`), this.docType);
  }

  get edit() {
    return new DocumentEdit(this.page.element(`nuxeo-document-edit`), this.docType);
  }

  get metadata() {
    return new DocumentMetadata(this.page.element('nuxeo-document-metadata'));
  }

  get editButton() {
    return this.page.element('#edit');
  }

  get saveButton() {
    return this.page.element('#save');
  }

  get previewButton() {
    return this.page.element('nuxeo-preview-button');
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }
}
