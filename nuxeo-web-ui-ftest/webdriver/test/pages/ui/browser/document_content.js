'use strict';

export default class DocumentContent {

  constructor(selector) {
    this.content = driver.element(selector);
    this.grid = this.content.element('#grid');
    this.table = this.content.element('#table');
  }

}
