import BasePage from '../base';
import AddToCollectionDialog from './browser/add_to_collection_dialog';
import PublicationDialog from './browser/publication_dialog';
import { clickActionMenu } from '../helpers';

export default class Selection extends BasePage {
  async addToClipboard() {
    const ele = await this.el;
    await ele.$('nuxeo-clipboard-documents-button').click();
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

  async trashDocuments() {
    await this.clickResultsActionMenu('nuxeo-delete-documents-button');
  }

  get trashDocumentsButton() {
    return this.el.element('nuxeo-delete-documents-button');
  }

  get publishDocumentsButton() {
    return this.el.element('nuxeo-publish-button #publishButton');
  }

  get publishDialog() {
    return (async () => {
      const elementIsExisting = await this.el.isExisting('#publishDialog');
      const elementIsVisible = await this.el.isVisible('#publishDialog');
      if ((await !elementIsExisting) || (await !elementIsVisible)) {
        await this.clickResultsActionMenu('nuxeo-publish-button');
      }
      const publishDialog = new PublicationDialog(`${this._selector} #publishDialog`);
      await publishDialog.waitForVisible();
      return publishDialog;
    })();
  }

  async clickResultsActionMenu(selector) {
    const ele = await this.el;
    await clickActionMenu(ele, selector);
  }

  get compare() {
    return this.el.element('nuxeo-document-diff-button');
  }
}
