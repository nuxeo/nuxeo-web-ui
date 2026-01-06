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

  /**
   * Central hardened click (Chrome 143+ safe)
   */
  async click() {
    const elem = this.el; // this.el is always a WDIO element

    await elem.waitForExist();
    await elem.waitForDisplayed();

    // Scroll into view (critical for Chrome 145)
    await elem.scrollIntoView({ block: 'center', inline: 'center' });

    // Wait until element has real size (WDIO v9-safe)
    await browser.waitUntil(
      async () => {
        const size = await elem.getSize();
        return size.width > 0 && size.height > 0;
      },
      {
        timeout: 5000,
        timeoutMsg: 'Element has zero size, cannot click',
      },
    );

    // Flush Polymer DOM updates if present
    await browser.execute(() => {
      if (window.Polymer?.dom?.flush) {
        window.Polymer.dom.flush();
      }
    });

    await elem.click();
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
