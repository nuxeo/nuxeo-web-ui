import BasePage from '../base';

export default class Clipboard extends BasePage {
  get nbItems() {
    const items = this.el.elements('#list .list-item');
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  get moveButton() {
    return this.el.element('#move');
  }

  get pasteButton() {
    return this.el.element('#paste');
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

  removeItem(title) {
    const items = this.el.elements('nuxeo-data-list#list .list-item');
    return items.some((item) => {
      if (item.isVisible() && item.getText('.list-item-title').trim() === title) {
        item.click('iron-icon.remove');
        return true;
      }
      return false;
    });
  }
}
