/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class Clipboard extends BasePage {
  get nbItems() {
    return (async () => {
      await driver.pause(3000);
      const items = await this.el.$$('#list .list-item');
      let count = 0;
      for (let index = 0; index < items.length; index++) {
        const isItemVisible = await items[index].isDisplayed();
        if (isItemVisible) {
          count++;
        }
      }
      return count;
    })();
  }

  get moveButton() {
    return this.el.$('#move');
  }

  get pasteButton() {
    return this.el.$('#paste');
  }

  async move() {
    const moveBtn = await this.moveButton;
    await moveBtn.waitForVisible();
    await moveBtn.waitForEnabled();
    await moveBtn.click();
  }

  async paste() {
    const copyBtn = await this.pasteButton;
    await copyBtn.waitForVisible();
    await copyBtn.waitForEnabled();
    await copyBtn.click();
  }

  async removeItem(title) {
    const items = await this.el.$$('nuxeo-data-list#list .list-item');
    let found = false;
    for (let index = 0; index < items.length; index++) {
      const itemVisible = await items[index].isVisible();
      const itemText = await items[index].$('.list-item-title').getText();
      if (itemVisible && itemText === title) {
        await items[index].$('iron-icon.remove').click();
        found = true;
      }
    }
    return found;
  }
}
