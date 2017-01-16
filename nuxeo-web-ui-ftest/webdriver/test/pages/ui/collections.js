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

  select(name) {
    let el = this.page.element(`nuxeo-collections #collectionsList #items span.title`);
    if (el.getText().trim() === name) {
      el.click();
      return true;
    } else {
      return false;
    }
  }

  get isQueueMode() {
    return this.page.isExisting(`#membersList`) && this.page.isVisible(`#membersList`);
  }

  get queueCount() {
    return this.page.elements(`#membersList #items div`).value.length;
  }

  hasDocument(doc) {
    let members = this.page.elements(`#membersList #items div`).value;
    return members.some((member) => member.isExisting(`span.list-item-title`) && member.getText(`span.list-item-title`).trim() === doc.title);
  }

  removeDocument(doc) {
    let members = this.page.elements(`#membersList #items div`).value;
    return members.some((member) => {
      if (member.getText(`span.list-item-title`).trim() === doc.title) {
        member.element(`iron-icon.remove`).click();
        return true;
      } else {
        return false;
      }
    });
  }

}
