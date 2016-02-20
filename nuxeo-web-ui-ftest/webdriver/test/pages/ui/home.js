'use strict';

export default class Home {

  constructor(selector) {
    this.selector = selector;
  }

  get classList() {
    return driver.getAttribute(this.selector, 'class').split(' ');
  }

  get isSelected() {
    return this.classList.indexOf('iron-selected') !== -1;
  }

}
