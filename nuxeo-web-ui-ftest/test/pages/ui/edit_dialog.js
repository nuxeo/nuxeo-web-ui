

import BasePage from '../base';
import DocumentEdit from './browser/document_edit';

export default class EditDialog extends BasePage {
  edit(docType) {
    return new DocumentEdit('nuxeo-document-edit', docType);
  }

  get saveButton() {
    return this.el.element('#save');
  }
}
