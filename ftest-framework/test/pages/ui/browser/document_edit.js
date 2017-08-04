'use strict';

import BasePage from '../../base';
import DocumentLayout from './document_layout';

export default class DocumentEdit extends BasePage {
  constructor(selector, docType) {
    super(selector);
    this._docType = docType;
  }

  set title(title) {
    return this.el.element('#input').setValue(title);
  }

  layout() {
    return new DocumentLayout(`nuxeo-${this._docType.toLowerCase()}-edit-layout`);
  }

}
