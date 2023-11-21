import BasePage from '../base';

export default class Clipboard extends BasePage {
  get nbItems() {
    return (async () => {
      await driver.pause(3000);
      const items = await this.el.$$('#list .list-item');

      const visibleItems = items.map(async (item) => {
        const isDisplayed = await item.isDisplayed();
        return isDisplayed;
      });
      const countVisibleItem = await Promise.all(visibleItems);
      const filterItem = countVisibleItem.filter((item) => item === true);
      return filterItem.length;
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
    const listItem = await this.el.$('nuxeo-data-list#list .list-item');
    await listItem.waitForVisible();
    const items = await this.el.$$('nuxeo-data-list#list .list-item');
    await driver.pause(3000);
    return items.some(async (item) => {
      const itemText = await item.getText();
      const itemVisible = await item.isVisible();
      console.log('itemText', itemText, 'itemVisible', itemVisible);
      if (itemVisible && itemText.trim() === title) {
        console.log('Item Clicked..............');
        await item.$('iron-icon.remove').click();
        return true;
      }
      return false;
    });
  }
}
