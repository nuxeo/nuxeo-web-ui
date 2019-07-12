

import BasePage from '../base';
import DocumentCreate from './browser/document_create';

export default class CreateDialog extends BasePage {
  get documentCreate() {
    return new DocumentCreate('nuxeo-document-create');
  }

  get csvImportTab() {
    return this.el.element('paper-tabs paper-tab[name="importCSV"]');
  }

  get createButton() {
    return this.el.element('paper-button[id="create"]');
  }
}
