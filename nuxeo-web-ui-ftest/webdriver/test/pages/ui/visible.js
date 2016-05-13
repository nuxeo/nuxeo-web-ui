'use strict';

export default class IsVisible {

  constructor(selector) {
    this.selector = selector;
  }

  get isVisible() {
    return driver.isVisible(this.selector);
  }

}
