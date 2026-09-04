/**
 * The announcement banner lives inside the `nuxeo-app` shadow root and renders its message in its
 * own shadow root, so its state is read through the browser rather than with plain selectors.
 */
export default class AnnouncementBanner {
  static _state() {
    return browser.execute(() => {
      const app = document.querySelector('nuxeo-app');
      const banner = app && app.shadowRoot && app.shadowRoot.querySelector('#announcementBanner');
      if (!banner) {
        return { present: false, displayed: false, text: '', href: null };
      }
      const link = banner.shadowRoot && banner.shadowRoot.querySelector('a');
      return {
        present: true,
        displayed: banner.hasAttribute('_opened') && banner.getBoundingClientRect().height > 0,
        text: (banner.shadowRoot ? banner.shadowRoot.textContent : '').replace(/\s+/g, ' ').trim(),
        href: link ? link.href : null,
      };
    });
  }

  static async isDisplayed() {
    return (await AnnouncementBanner._state()).displayed;
  }

  static async waitForDisplayed(reverse = false) {
    await driver.waitUntil(async () => (await AnnouncementBanner.isDisplayed()) !== reverse, {
      timeoutMsg: `Expected the announcement banner to be ${reverse ? 'hidden' : 'displayed'}`,
    });
    return true;
  }

  static async waitForMessage(message) {
    await driver.waitUntil(
      async () => {
        const state = await AnnouncementBanner._state();
        return state.displayed && state.text.includes(message);
      },
      { timeoutMsg: `Expected the announcement banner to display "${message}"` },
    );
    return true;
  }

  static async linkHref() {
    return (await AnnouncementBanner._state()).href;
  }
}
