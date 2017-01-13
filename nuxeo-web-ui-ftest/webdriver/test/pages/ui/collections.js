'use strict';

export default class Collections {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.page = driver.element(selector);
  }

  hasCollection(name) {
    driver.waitUntil(function () {
      try {
        let collections = this.page.getText(`span.collection-name`);
        if (Array.isArray(collections)) {
          return collections.some((txt) => txt.trim() === name);
        } else {
         return collections.trim() === name;
        }
        return true;
      } catch(e) {
        return false;
      }
    }.bind(this), 5000, `There is no such collection`);
    return true;
  }

}
