'use strict';

export default class Home {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.dashboard = driver.element(selector);

  }

  isVisible() {
    return this.dashboard.isVisible();
  }

  card(title) {
    return this.dashboard.element('///paper-card//span[contains(@class,"title") and normalize-space(text())="' + title + '"]');
  }
}
