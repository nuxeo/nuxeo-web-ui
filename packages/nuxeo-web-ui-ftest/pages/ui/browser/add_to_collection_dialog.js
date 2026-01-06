import BasePage from '../../base.js';

export default class AddToCollectionDialog extends BasePage {
  async addToCollection(collectionName) {
    const collectionSelect = await this.el.$('#nxSelect');
    await collectionSelect.waitForVisible();
    await fixtures.layouts.setValue(collectionSelect, collectionName);
    // await this.el.waitForEnabled('paper-button[name="add"]');
    // Give selectivity a moment to render results (or auto-close)
    await browser.pause(100);
    // Check if suggestion dropdown is still open
    const suggestions = await browser.$$('nuxeo-selectivity .selectivity-result-item');
    if (suggestions.length > 0) {
      // More than one match → explicitly select first
      await suggestions[0].click();
    }
    // Ensure focus is removed
    await browser.execute(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    });

    const addCollection = await this.el.$('paper-button[name = "add"]');
    await browser.waitUntil(
      async () => {
        const ariaDisabled = await addCollection.getAttribute('aria-disabled');
        return ariaDisabled === 'false';
      },
      {
        timeout: 5000,
        timeoutMsg: 'Add button did not become enabled',
      },
    );
    await addCollection.click();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
