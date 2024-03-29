export default class BasePage {
  constructor(selector) {
    this._selector = selector;
  }

  get el() {
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

  async waitForNotVisible(selector) {
    if (selector) {
      const ele = await this.el.$(...[selector].filter(Boolean).concat([browser.options.waitForTimeout, true]));
      const isSelectorVisible = await this.waitForVisible(ele);
      return isSelectorVisible;
    }
    return false;
  }
}
