import BasePage from '../../base';

export default class AddToCollectionDialog extends BasePage {
  async addToCollection(collectionName) {
    try {
      // Wait for and get the collection select element
      const collectionSelect = await this.el.$('#nxSelect');
      await collectionSelect.waitForVisible({ timeout: 30000 });

      // Set the collection value
      await fixtures.layouts.setValue(collectionSelect, collectionName);
      await driver.pause(1000); // Small pause to ensure value is set

      // Wait for add button to be enabled
      await this.el.waitForEnabled('paper-button[name="add"]', 30000);

      // Get and click the add button
      const addButton = await this.el.$('paper-button[name="add"]');
      await addButton.click();

      // Wait briefly to ensure the collection is added
      await driver.pause(1000);
    } catch (e) {
      throw new Error(`Failed to add to collection in dialog: ${e}`);
    }
  }

  async waitForVisible(timeout = 30000) {
    return this.el.waitForVisible({ timeout });
  }
}
