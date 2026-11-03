import BasePage from '../../base.js';

export default class Announcement extends BasePage {
  get enabledToggle() {
    return this.el.$('#enabled');
  }

  get messageInput() {
    return this.el.$('#message');
  }

  get linkUrlInput() {
    return this.el.$('#linkUrl');
  }

  get linkLabelInput() {
    return this.el.$('#linkLabel');
  }

  get saveButton() {
    return this.el.$('#save');
  }

  /**
   * Blocks until the form has finished its current request. The fields are visible while the initial
   * GET is still in flight and `_busy` disables them, so reading or clicking a control before this
   * settles can act on a stale value or on a disabled element.
   */
  async waitForIdle() {
    await driver.waitUntil(
      async () => {
        try {
          return (await this.el.getProperty('_busy')) === false;
        } catch (e) {
          // Element may be temporarily detached while the form re-renders — keep waiting.
          return false;
        }
      },
      {
        timeout: browser.options.waitforTimeout,
        interval: 250,
        timeoutMsg: 'Announcement form did not finish loading',
      },
    );
  }

  async setEnabled(enabled) {
    const toggle = await this.enabledToggle;
    await toggle.waitForVisible();
    await this.waitForIdle();
    const checked = await toggle.getProperty('checked');
    if (checked !== enabled) {
      await toggle.click();
    }
  }

  async fillMessage(message) {
    const field = await this.messageInput;
    await field.waitForVisible();
    await this.waitForIdle();
    // `nuxeo-textarea` is a wrapper; the editable control is the native textarea it exposes as
    // `#textarea` — the same selector the functional-test field registry uses for this component.
    const textarea = await field.$('#textarea');
    await textarea.setValue(message);
  }

  async fillLink(linkUrl, linkLabel) {
    await this.waitForIdle();
    if (linkUrl !== undefined) {
      const field = await this.linkUrlInput;
      await field.waitForVisible();
      await (await field.$('.input-element input')).setValue(linkUrl);
    }
    if (linkLabel !== undefined) {
      const field = await this.linkLabelInput;
      await field.waitForVisible();
      await (await field.$('.input-element input')).setValue(linkLabel);
    }
  }

  async save() {
    const button = await this.saveButton;
    await button.waitForVisible();
    await button.click();
    // The click only starts the POST/PUT. Without waiting for it to settle, a following
    // assertion or a cleanup hook can run against a form that is still saving, and leave the
    // test entry behind. `this.el` is resolved through WDIO's shadow-piercing `$`, so
    // `getProperty` reads `_saving` across `nuxeo-admin`'s shadow boundary.
    await driver.waitUntil(
      async () => {
        try {
          return (await this.el.getProperty('_saving')) === false;
        } catch (e) {
          // Element may be temporarily detached while the form re-renders — keep waiting.
          return false;
        }
      },
      {
        timeout: browser.options.waitforTimeout,
        interval: 250,
        timeoutMsg: 'Announcement save did not complete',
      },
    );
  }
}
