'use strict';

import BasePage from '../base';

export default class Clipboard extends BasePage {

  get nbItems() {
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

}
