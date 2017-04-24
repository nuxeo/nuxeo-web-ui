'use strict';

export default class ActivityFeed {

  constructor(selector) {
    this._selector = selector;
  }

  get page() {
    return driver.element(this._selector);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  getActivity(activity) {
    return this.page.element(`///*[text()="${activity}"]`);
  }

}