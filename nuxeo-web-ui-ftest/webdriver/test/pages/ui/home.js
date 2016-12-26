'use strict';

export default class Home {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.dashboard = driver.element(selector);
  }

  isVisible() {
    return this.dashboard.isVisible();
  }

  card(contentId) {
    debugger;
    return this.dashboard.element(`#${contentId}`);
  }
}
