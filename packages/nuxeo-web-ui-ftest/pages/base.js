export default class BasePage {
  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    return $(this._selector);
  }

  async isTrulyVisible(elem) {
    const isDisplayed = await elem.isDisplayed();
    const size = await elem.getSize();
    return isDisplayed && size.width > 0 && size.height > 0;
  }

  click(...args) {
    return this.el.click(...args);
  }

  isVisible(...args) {
    return this.el.isVisible(...args);
  }

  async waitForVisible(...args) {
    if (typeof args[0] === 'string') {
      // Child selector — delegate to element-level custom waitForVisible
      return this.el.waitForVisible(...args);
    }
    // Self — use built-in waitForDisplayed to avoid WDIO v9 crash
    // when the element does not yet exist (custom commands eagerly resolve)
    const [timeout, reverse = false] = args;
    return this.el.waitForDisplayed({ timeout, reverse });
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
