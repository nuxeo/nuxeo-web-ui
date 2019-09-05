import BasePage from '../../base';

export default class AddToCollectionDialog extends BasePage {
  addToCollection(collectionName) {
    const collectionSelect = this.el.element('#nxSelect');
    collectionSelect.waitForVisible();
    fixtures.layouts.setValue(collectionSelect, collectionName);
    this.el.waitForEnabled('paper-button[name="add"]');
    this.el.click('paper-button[name = "add"]');
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
