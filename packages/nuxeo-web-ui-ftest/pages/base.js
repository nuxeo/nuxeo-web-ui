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

  /**
   * Robustly click an element that opens an in-app (non-native) dialog.
   *
   * On newer Chrome (150+), Polymer `paper-button`s inside sticky `.actions` bars are often
   * reported as "element not interactable" or intercepted by the bar even when visible, because
   * the default scroll before a click leaves them under the sticky region. This centres the
   * element first, waits briefly for it to settle (ripple animations), then clicks; if the
   * WebDriver click is still rejected it falls back to a DOM click.
   *
   * Do NOT use this for buttons that trigger a native `window.confirm` (e.g. delete/revoke):
   * those must use the plain classic click so `alertAccept()`/`alertDismiss()` can handle the
   * dialog. The DOM-click fallback here is only safe because these buttons open in-app dialogs.
   */
  async scrollAndClick(elem) {
    await elem.scrollIntoView({ block: 'center', inline: 'center' });
    try {
      await elem.waitForClickable({ timeout: 5000 });
      await elem.click();
    } catch (e) {
      await browser.execute((el) => el.click(), elem);
    }
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
      const ele = await this.el.$(selector);
      await ele.waitForDisplayed({ timeout: browser.options.waitforTimeout, reverse: true });
      return true;
    }
    return false;
  }
}
