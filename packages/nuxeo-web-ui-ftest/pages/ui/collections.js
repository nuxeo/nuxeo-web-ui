/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class Collections extends BasePage {
  async waitForHasCollection(name, reverse) {
    const el = await this.el;

    await driver.waitUntil(
      async () => {
        const collections = await el.$$('span.collection-name');
        if (reverse) {
          return collections.every(async (collection) => (await collection.getText()).trim() !== name);
        }
        return collections.some(async (collection) => (await collection.getText()).trim() === name);
      },
      reverse ? 'There is such collection' : 'There is no such collection',
      {
        timeoutMsg: 'waitForHasCollection timedout',
      },
    );
    return true;
  }

  async select(name) {
    const ele = await this.el;
    const rows = await ele.$$('#collectionsList span.title');
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i];
      const textEle = await el.getText();
      if (textEle.trim() === name) {
        await el.click();
        return true;
      }
    }
    return false;
  }

  get isQueueMode() {
    const abc = this.el.isExisting('#membersList') && this.el.isVisible('#membersList');
    return abc;
  }

  get queueCount() {
    return this.el.$$('#membersList div').length;
  }

  async waitForHasMember(doc, reverse) {
    await driver.pause(1000);
    const result = await (async () => {
      const ele = await this.el;
      const entriesTitle = await ele.$$('#membersList .list-item-title').map((img) => img.getText());
      const index = await entriesTitle.findIndex((currenTitle) => currenTitle.trim() === doc.title);
      if (reverse) {
        if (index !== -1) {
          return false;
        }
      } else {
        if (index !== -1) {
          return true;
        }
        return false;
      }
      return true;
    })();
    return result;
  }

  async removeMember(doc) {
    const members = await this.el.$$('#membersList');
    for (let i = 0; i < members.length; i++) {
      const member = await members[i].$('span.list-item-title');
      const isRowVisibleEle = await member.isVisible();
      const getTextEle = await member.getText();
      if (isRowVisibleEle && getTextEle.trim() === doc.title) {
        const buttonEle = await members[i].$('iron-icon.remove');
        await buttonEle.click();
        return true;
      }
    }
    return false;
  }
}
