

import BasePage from '../base';

export default class Selection extends BasePage {
  addToClipboard() {
    this.el.element('nuxeo-clipboard-documents-button').click();
    this.waitForNotVisible();
  }

  moveDown() {
    this.el.waitForVisible('nuxeo-move-documents-down-button');
    this.el.element('nuxeo-move-documents-down-button').click();
  }

  moveUp() {
    this.el.waitForVisible('nuxeo-move-documents-up-button');
    this.el.element('nuxeo-move-documents-up-button').click();
  }

  trashDocuments() {
    const el = this.trashDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  deleteDocuments() {
    const el = this.deleteDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  untrashDocuments() {
    const el = this.untrashDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  get trashDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-delete-documents-button #deleteAllButton');
  }

  get untrashDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-untrash-documents-button #untrashAllButton');
  }

  get deleteDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-delete-documents-button[hard] #deleteAllButton');
  }
}
