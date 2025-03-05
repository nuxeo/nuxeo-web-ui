import BasePage from '../../base.js';

export default class DocumentAttachments extends BasePage {
  constructor(selector, docType) {
    super(selector);
    this.docType = docType;
  }

  get previewButton() {
    return this.el.element('nuxeo-preview-button');
  }

  get preview() {
    return this.el.element('nuxeo-document-preview');
  }
}
