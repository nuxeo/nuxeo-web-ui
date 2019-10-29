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

  get importCsvDialog() {
    return this.el.element('#csvCreation');
  }

  setFileToImport(file) {
    const field = this.importCsvDialog.element('#dropzone #uploadFiles');
    field.waitForExist();
    return field.chooseFile(path.resolve(fixtures.blobs.get(file)));
  }

  get importCsvButton() {
    return this.importCsvDialog.element('div[name="upload"] paper-button.primary');
  }

  get selectedFileToImport() {
    return this.el.element('#dropzone div.complete');
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
