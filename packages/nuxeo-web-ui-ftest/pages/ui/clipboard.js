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

  async move() {
    const moveBtn = await this.moveButton;
    await moveBtn.waitForVisible();
    await moveBtn.waitForEnabled();
    await moveBtn.click();
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
    const itemText = await this.el.$$('nuxeo-data-list#list .list-item').map((item) => item.getText());

    console.log('ABBBBC..............', items.length, itemText);
    return items.some((item, index) => {
      if (itemText[index].trim() === title) {
        console.log('Item Clicked..............');
        item.$('iron-icon.remove').click();
        return true;
      }
      return false;
    });
  }
}
