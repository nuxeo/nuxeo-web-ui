'use strict';

export default class BasePage {

  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    return driver.element(this._selector);
  }

  isVisible() {
    return this.el.isVisible();
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }

}
