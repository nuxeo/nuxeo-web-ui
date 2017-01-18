'use strict';

export default class Home {

  constructor(selector) {
    driver.waitForVisible(selector);
    this.dashboard = driver.element(selector);
  }

  isVisible() {
    return this.dashboard.isVisible();
  }

  card(contentId) {
    return this.dashboard.element(`#${contentId}`);
  }
}
