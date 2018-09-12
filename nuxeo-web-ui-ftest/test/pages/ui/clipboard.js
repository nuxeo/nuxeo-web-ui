'use strict';

import BasePage from '../base';

export default class Clipboard extends BasePage {

  get nbItems() {
    // we need to force the clipboard storage reload since we may have by-passed it in the fixture
    browser.execute(() => document.querySelector('* >>> nuxeo-clipboard >>> #storage').reload());
    const items = this.el.elements(`#list .list-item`).value;
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  move() {
    const moveBtn = this.el.element(`#move`);
    moveBtn.waitForVisible();
    moveBtn.waitForEnabled();
    moveBtn.click();
  }

  paste() {
    const copyBtn = this.el.element(`#paste`);
    copyBtn.waitForVisible();
    copyBtn.waitForEnabled();
    copyBtn.click();
  }

  removeItem(title) {
    const items = this.el.elements('nuxeo-data-list#list .list-item').value;
    return items.some((item) => {
      if (item.isVisible() && item.getText(`.list-item-title`).trim() === title) {
        item.click(`iron-icon.remove`);
        return true;
      } else {
        return false;
      }
    });
  }

}
