import BasePage from '../../base';
import DocumentLayout from './document_layout';
import DocumentAttachments from './document_attachments';

export default class DocumentMetadata extends BasePage {
  constructor(selector, docType) {
    super(selector);
    this._docType = docType;
  }

  layout() {
    return new DocumentLayout(`nuxeo-${this._docType.toLowerCase()}-metadata-layout`);
  }

  get attachments() {
    return new DocumentAttachments('nuxeo-document-attachments', this.docType);
  }
}
