'use strict';

import DocumentCreate from 'document_create'

export default class CreateDialog {

  constructor(el) {
    this.el = el;
  }

  get isVisible() {
    return this.el.isVisible();
  }

  get documentCreate() {
    return new DocumentCreate(this.el.element('nuxeo-document-create'));
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }

  submit() {
    this.el.click('///paper-button[text()="Create"]');
  }

}
