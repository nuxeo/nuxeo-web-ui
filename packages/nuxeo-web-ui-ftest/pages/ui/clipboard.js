/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class Clipboard extends BasePage {
  get nbItems() {
    return (async () => {
      await driver.pause(3000);
      const items = await this.el.$$('#list .list-item');
      console.log('items', items.length);
      let count = 0;
      for (let index = 0; index < items.length; index++) {
        const isItemVisible = await items[index].isDisplayed();
        if (isItemVisible) {
          count++;
        }
      }
      // items.forEach((item) => {
      //   if (item.isVisible()) {
      //     count++;
      //   }
      // });
      console.log('count', count);
      return count;
    })();
  }

  get moveButton() {
    return this.el.$('#move');
  }

  get pasteButton() {
    return this.el.$('#paste');
  }

  move() {
    const moveBtn = this.moveButton;
    moveBtn.waitForVisible();
    moveBtn.waitForEnabled();
    moveBtn.click();
  }

  paste() {
    const copyBtn = this.pasteButton;
    copyBtn.waitForVisible();
    copyBtn.waitForEnabled();
    copyBtn.click();
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
    // return items.some((item) => {
    //   if (item.isVisible() && item.getText('.list-item-title').trim() === title) {
    //     item.click('iron-icon.remove');
    //     return true;
    //   }
    //   return false;
    // });
  }
}
