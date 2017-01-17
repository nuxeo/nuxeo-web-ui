'use strict';

export default class Favorites {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.page = driver.element(selector);
  }

  hasDocument(doc) {
    /*let members = this.page.elements(`#membersList #items div`).value;
    return members.some((member) => member.isExisting(`span.list-item-title`) && member.getText(`span.list-item-title`).trim() === doc.title);*/
    return true;
  }

  removeDocument(doc) {
    return true;
  }

}
