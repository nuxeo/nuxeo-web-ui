'use strict';

export default class DocumentMetadata {
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
}
