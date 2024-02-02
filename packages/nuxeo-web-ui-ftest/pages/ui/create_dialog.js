/* eslint-disable no-await-in-loop */

import path from 'path';
import BasePage from '../base';
import DocumentCreate from './browser/document_create';
import DocumentLayout from './browser/document_layout';

export default class CreateDialog extends BasePage {
  get documentCreate() {
    return new DocumentCreate('nuxeo-document-create');
  }

  get documentImportLayout() {
    return new DocumentLayout('nuxeo-document-import');
  }

  async importTab(name) {
    const ele = await this.el.element(`paper-tab[name="${name}"]`);
    return ele;
  }

  get pages() {
    return (async () => this.el.element('#holder iron-pages'))();
  }

  /**
   * Specific csv import page element.
   *
   * @deprecated since 3.0.3. Please use method importPage instead.
   * */
  get importCsvDialog() {
    return this.el.element('#csvCreation');
  }

  async importPage(name) {
    const getPages = await this.pages;
    const page = await getPages.element('.iron-selected');
    const pageName = await page.getAttribute('name');
    if (pageName === name) {
      const pageEle = await getPages.element(`[name=${pageName}]`);
      return pageEle;
    }
    throw new Error(`The "${name}" element could not be located. Received "${pageName}" instead`);
  }

  /**
   * Upload a file on the csv import dialog.
   *
   * @deprecated since 3.0.3. Please use method upload instead.
   * */

  async setFileToImport(file) {
    const CsvDialog = await this.importCsvDialog;
    const field = await CsvDialog.element('#dropzone #uploadFiles');
    await field.waitForExist();
    return field.chooseFile(path.resolve(fixtures.blobs.get(file)));
  }

  async upload(file, name) {
    const importPage = await this.importPage(name);
    await importPage.waitForVisible();
    const field = await importPage.element('#dropzone #uploadFiles');
    await field.waitForExist();
    // XXX we need to reset the input value to prevent duplicate upload of files (when the method is called recursively)
    browser.execute((el) => {
      el.value = '';
    }, field);
    return field.chooseFile(path.resolve(fixtures.blobs.get(file)));
  }

  get importCreateButton() {
    return this.el.element('div[name="upload"] paper-button[id="create"]');
  }

  get importCreateButtonProperties() {
    return (async () => this.el.$('paper-button[name="createWithProperties"]'))();
  }

  get importCSVButton() {
    return (async () => {
      const impCsvBtn = await this.el.element('div[name="upload"] paper-button.primary');
      return impCsvBtn;
    })();
  }

  get selectedCSVToImport() {
    return this.el.element('#dropzone div.complete');
  }

  get selectedFileToImport() {
    return (async () => {
      const filetoImp = await this.el.element('div.file-to-import');
      return filetoImp;
    })();
  }

  get importCloseButton() {
    return (async () => {
      const impClose = await this.el.element('div[name="progress"] paper-button.primary');
      return impClose;
    })();
  }

  get importError() {
    return this.el.element('div[name="progress"] #list div.item');
  }

  get importSuccess() {
    return (async () => {
      const impSuccess = await this.el.element('#progress div.successful');
      return impSuccess;
    })();
  }

  get createButton() {
    return this.el.element('paper-button[id="create"]');
  }

  get addProperties() {
    return this.el.element('paper-button[id="edit"]');
  }

  get selectAnAssetType() {
    return (async () => {
      const assetElement = await this.el.$('nuxeo-select[name="assetType"]');
      return assetElement;
    })();
  }

  get applyAll() {
    return (async () => this.el.$('paper-button[name="applyAll"]'))();
  }

  async selectAssetType(val) {
    await driver.waitForVisible('nuxeo-select[id="docTypeDropdown"] paper-item');
    const selectAssetElements = await this.el.elements('nuxeo-select[id="docTypeDropdown"] paper-item[role="option"]');
    let selectAsset;
    for (let i = 0; i < selectAssetElements.length; i++) {
      const e = selectAssetElements[i];
      const text = await e.getText();
      if (text === val) {
        selectAsset = e;
        break;
      }
    }
    await selectAsset.click();
  }
}
