'use strict';

export default class HistoryTable {

  constructor(selector) {
    this._selector = selector;
  }

  get page() {
    return driver.element(this._selector);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  getHistory(event) {
    return this.page.element(`///*[text()="${event}"]`);
  }

}