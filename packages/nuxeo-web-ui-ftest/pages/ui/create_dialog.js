import path from 'path';
import BasePage from '../base';
import DocumentCreate from './browser/document_create';

export default class CreateDialog extends BasePage {
  get documentCreate() {
    return new DocumentCreate('nuxeo-document-create');
  }

  importTab(name) {
    return this.el.element(`paper-tab[name="${name}"]`);
  }

  get pages() {
    return this.el.element('#holder iron-pages');
  }

  importPage(name) {
    const pageName = this.pages.element('.iron-selected').getAttribute('name');
    if (pageName === name) {
      return this.pages.element(`[name=${pageName}]`);
    }
    throw new Error(`The "${name}" element could not be located. Received "${pageName}" instead`);
  }

  setFileToImport(file, name) {
    const field = this.importPage(name).element('#dropzone #uploadFiles');
    field.waitForExist();
    return field.chooseFile(path.resolve(fixtures.blobs.get(file)));
  }

  get importCreateButton() {
    return this.el.element('div[name="upload"] paper-button[id="create"]');
  }

  get importCSVButton() {
    return this.el.element('div[name="upload"] paper-button.primary');
  }

  get selectedCSVToImport() {
    return this.el.element('#dropzone div.complete');
  }

  get selectedFileToImport() {
    return this.el.element('div.file-to-import');
  }

  get importCloseButton() {
    return this.el.element('div[name="progress"] paper-button.primary');
  }

  get importError() {
    return this.el.element('div[name="progress"] #list div.item');
  }

  get importSuccess() {
    return this.el.element('#progress div.successful');
  }

  get createButton() {
    return this.el.element('paper-button[id="create"]');
  }
}
