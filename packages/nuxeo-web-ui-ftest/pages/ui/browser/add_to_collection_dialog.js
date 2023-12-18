import BasePage from '../../base';

export default class AddToCollectionDialog extends BasePage {
  async addToCollection(collectionName) {
    const collectionSelect = await this.el.$('#nxSelect');
    await collectionSelect.waitForVisible();
    await fixtures.layouts.setValue(collectionSelect, collectionName);
    await this.el.waitForEnabled('paper-button[name="add"]');
    const addCollection = await this.el.$('paper-button[name = "add"]');
    await addCollection.click();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
