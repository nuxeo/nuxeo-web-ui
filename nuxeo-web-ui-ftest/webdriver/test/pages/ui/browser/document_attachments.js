'use strict';

export default class DocumentAttachments {
  constructor(el, docType) {
    this.el = el;
    this.docType = docType;
  }

  isVisible() {
    return this.el.isVisible();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }

  get previewButton() {
    return this.el.element('nuxeo-preview-button');
  }

  get preview() {
    return this.el.element('nuxeo-document-preview');
  }
}
