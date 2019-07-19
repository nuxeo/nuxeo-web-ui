export default class BasePage {
  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    driver.waitForExist(this._selector);
    return driver.element(this._selector);
  }

  isVisible(...args) {
    return this.el.isVisible(...args);
  }

  waitForVisible(...args) {
    return this.el.waitForVisible(...args);
  }

  waitForNotVisible(selector) {
    return this.waitForVisible(...[selector].filter(Boolean).concat([browser.options.waitForTimeout, true]));
  }
}
