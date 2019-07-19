import BasePage from '../base';
import AddToCollectionDialog from './browser/add_to_collection_dialog';
import PublicationDialog from './browser/publication_dialog';

export default class Selection extends BasePage {
  addToClipboard() {
    this.el.element('nuxeo-clipboard-documents-button').click();
    this.waitForNotVisible();
  }

  get addDocumentsToCollectionButton() {
    return this.el.element('nuxeo-add-to-collection-documents-button');
  }

  get addToCollectionDialog() {
    const button = this.addDocumentsToCollectionButton;
    button.waitForVisible();
    if (!button.isExisting('#dialog') || !button.isVisible('#dialog')) {
      button.click();
    }
    const dialog = new AddToCollectionDialog(`${this._selector} nuxeo-add-to-collection-documents-button #dialog`);
    dialog.waitForVisible();
    return dialog;
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

  get trashDocumentsButton() {
    // XXX: using a more specific selector here to ensure we can check for isExisting()
    return this.el.element('nuxeo-delete-documents-button #deleteAllButton');
  }

  get publishDocumentsButton() {
    return this.el.element('nuxeo-publish-button #publishButton');
  }

  get publishDialog() {
    if (!this.el.isExisting('#publishDialog') || !this.el.isVisible('#publishDialog')) {
      const button = this.publishDocumentsButton;
      button.waitForVisible();
      button.click();
    }
    const publishDialog = new PublicationDialog(`${this._selector} #publishDialog`);
    publishDialog.waitForVisible();
    return publishDialog;
  }
}
