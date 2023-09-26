import BasePage from '../base';
import AddToCollectionDialog from './browser/add_to_collection_dialog';
import PublicationDialog from './browser/publication_dialog';
import { clickActionMenu } from '../helpers';

export default class Selection extends BasePage {
  async addToClipboard() {
    const button = await this.el.element('nuxeo-clipboard-documents-button');
    await button.click();
    await this.waitForNotVisible();
  }

  get addDocumentsToCollectionButton() {
    return (async () => {
      const thisEle = await this.el;
      const documentsButtonEle = await thisEle.$('nuxeo-add-to-collection-documents-button');
      return documentsButtonEle;
    })();
  }

  get addToCollectionDialog() {
    return (async () => {
      const button = await this.addDocumentsToCollectionButton;
      await button.waitForVisible();

      if (!(await button.isExisting('#dialog')) || !(await button.isVisible('#dialog'))) {
        await button.click();
      }
      const dialog = new AddToCollectionDialog(
        `${await this._selector} nuxeo-add-to-collection-documents-button #dialog`,
      );
      await dialog.waitForVisible();
      return dialog;
    })();
  }

  async moveDown() {
    await this.el.waitForVisible('nuxeo-move-documents-down-button');
    const ele = await this.el.element('nuxeo-move-documents-down-button');
    await ele.click();
  }

  async moveUp() {
    await this.el.waitForVisible('nuxeo-move-documents-up-button');
    const ele = await this.el.element('nuxeo-move-documents-up-button');
    await ele.click();
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
