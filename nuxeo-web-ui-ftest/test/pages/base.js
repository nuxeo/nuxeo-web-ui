'use strict';

export default class BasePage {

  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    driver.waitForExist(this._selector);
    return driver.element(this._selector);
  }

  isVisible() {
    return this.el.isVisible.apply(this, arguments);
  }

  waitForVisible() {
    return this.el.waitForVisible.apply(this, arguments);
  }

  waitForNotVisible(selector) {
    return this.waitForVisible.apply(this, [selector].filter(Boolean).concat([browser.options.waitForTimeout, true]));
  }

}
