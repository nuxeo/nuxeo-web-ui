import BasePage from '../base';

export default class Collections extends BasePage {
  waitForHasCollection(name, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const collections = el.elements('span.collection-name');
        if (reverse) {
          return collections.every((collection) => collection.getText().trim() !== name);
        }
        return collections.some((collection) => collection.getText().trim() === name);
      },
      reverse ? 'There is such collection' : 'There is no such collection',
    );
    return true;
  }

  select(name) {
    const el = this.el.element('#collectionsList span.title');
    if (el.getText().trim() === name) {
      el.click();
      return true;
    }
    return false;
  }

  get isQueueMode() {
    return this.el.isExisting('#membersList') && this.el.isVisible('#membersList');
  }

  get queueCount() {
    return this.el.elements('#membersList div').length;
  }

  waitForHasMember(doc, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const members = el.elements('#membersList .list-item-title');
        if (reverse) {
          return members.every((member) => member.getText().trim() !== doc.title);
        }
        return members.some((member) => member.getText().trim() === doc.title);
      },
      reverse ? 'There is such member in the collection' : 'There is no such member in the collection',
    );
    return true;
  }

  removeMember(doc) {
    const members = this.el.elements('#membersList');
    return members.some((member) => {
      if (member.isVisible('span.list-item-title') && member.getText('span.list-item-title').trim() === doc.title) {
        member.click('iron-icon.remove');
        return true;
      }
      return false;
    });
  }
}
