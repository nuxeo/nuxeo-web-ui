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
  async click(options = {}) {
    const { timeout = browser.options.waitForTimeout || 5000, retries = 2, scrollBlock = 'center' } = options;

    const element = this.el;

    await element.waitForDisplayed({ timeout });

    const attemptClick = async (attempt) => {
      try {
        // Scroll into view
        await element.scrollIntoView({
          block: scrollBlock,
          inline: 'center',
        });

        // Flush Polymer safely
        await browser.execute(() => {
          if (window.Polymer && typeof window.Polymer.flush === 'function') {
            window.Polymer.flush();
          }
        });

        // Ensure truly visible
        await browser.waitUntil(async () => this.isTrulyVisible(element), { timeout });

        // Ensure enabled
        await browser.waitUntil(
          async () => {
            const disabled =
              (await element.getAttribute('disabled')) === 'true' ||
              (await element.getAttribute('aria-disabled')) === 'true';
            return !disabled;
          },
          { timeout },
        );

        await element.click();
      } catch (err) {
        if (attempt >= retries) {
          throw err;
        }
        await browser.pause(100);
        return attemptClick(attempt + 1);
      }
    };

    return attemptClick(0);
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
