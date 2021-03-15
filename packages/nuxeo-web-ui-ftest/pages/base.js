export default class BasePage {
  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    // driver.waitForExist(this._selector);
    return $(this._selector);
  }

  click(...args) {
    return this.el.click(...args);
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
