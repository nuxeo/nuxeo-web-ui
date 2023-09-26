/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class Clipboard extends BasePage {
  get nbItems() {
    return (async () => {
      await driver.pause(1000);
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
    return (async () => {
      const moveButton = await this.el.$('#move');
      return moveButton;
    })();
  }

  get pasteButton() {
    return (async () => {
      const pasteButton = await this.el.$('#paste');
      return pasteButton;
    })();
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
    await driver.pause(1000);
    let found = false;
    for (let index = 0; index < items.length; index++) {
      const itemVisible = await items[index].isVisible();
      const item = await items[index].$('.list-item-title');
      const itemText = await item.getText();
      if (itemVisible && itemText === title) {
        const ele = await items[index].$('iron-icon.remove');
        await ele.click();
        found = true;
      }
    }
    return found;
  }
}
