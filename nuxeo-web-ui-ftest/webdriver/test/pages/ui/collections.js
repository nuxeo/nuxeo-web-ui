'use strict';

import BasePage from '../base';

export default class Collections extends BasePage {

  waitForHasCollection(name, reverse) {
    const el = this.el;
    driver.waitUntil(() => {
      const collections = el.elements(`span.collection-name`).value;
      if (reverse) {
        return collections.every((collection) => collection.getText().trim() !== name);
      } else {
        return collections.some((collection) => collection.getText().trim() === name);
      }
    }, reverse ? `There is such collection` : `There is no such collection`);
    return true;
  }

  select(name) {
    const el = this.el.element(`nuxeo-collections #collectionsList #items span.title`);
    if (el.getText().trim() === name) {
      el.click();
      return true;
    } else {
      return false;
    }
  }

  get isQueueMode() {
    return this.el.isExisting(`#membersList`) && this.el.isVisible(`#membersList`);
  }

  get queueCount() {
    return this.el.elements(`#membersList #items div`).value.length;
  }

  waitForHasMember(doc, reverse) {
    const el = this.el;
    driver.waitUntil(() => {
      const members = el.elements(`#membersList .list-item-title`).value;
      if (reverse) {
        return members.every((member) => member.getText().trim() !== doc.title);
      } else {
        return members.some((member) => member.getText().trim() === doc.title);
      }
    }, reverse ? `There is such member in the collection` : `There is no such member in the collection`);
    return true;
  }

  removeMember(doc) {
    const members = this.el.elements(`#membersList #items div`).value;
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
