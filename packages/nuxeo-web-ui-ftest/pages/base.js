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
    // Self — use waitUntil with isExisting guard to prevent WDIO v9 process crash
    // when the element does not yet exist (implicitWait throws unhandled errors)
    const [timeout = 10000] = args;
    await driver.waitUntil(
      async () => {
        try {
          const el = await $(this._selector);
          return (await el.isExisting()) && (await el.isDisplayed());
        } catch (e) {
          return false;
        }
      },
      {
        timeout,
        interval: 500,
        timeoutMsg: `Element "${this._selector}" not visible after ${timeout}ms`,
      },
    );
    return true;
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
