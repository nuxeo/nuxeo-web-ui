'use strict';

export default class Collections {

  constructor(selector) {
    driver.waitForVisible(selector);
    this.page = driver.element(selector);
  }

  waitForHasCollection(name, reverse) {
    driver.waitUntil(() => {
      const collections = this.page.elements(`span.collection-name`).value;
      if (reverse) {
        return collections.every((collection) => collection.getText().trim() !== name);
      } else {
        return collections.some((collection) => collection.getText().trim() === name);
      }
    }, reverse ? `There is such collection` : `There is no such collection`);
    return true;
  }

  select(name) {
    const el = this.page.element(`nuxeo-collections #collectionsList #items span.title`);
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

  waitForHasMember(doc, reverse) {
    driver.waitUntil(() => {
      const members = this.page.elements(`#membersList #items div`).value;
      if (reverse) {
        return members.every((member) => member.getText().trim() !== doc.title);
      } else {
        return members.some((member) => member.getText().trim() === doc.title);
      }
    }, reverse ? `There is such member in the collection` : `There is no such member in the collection`);
    return true;
  }

  removeMember(doc) {
    const members = this.page.elements(`#membersList #items div`).value;
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
