import BasePage from '../base';

export default class Recents extends BasePage {
  get nbItems() {
    return (async () => {
      const items = await this.el.$$('#recentDocumentsList .list-item');
      let count = 0;
      items.forEach(async (item) => {
        if (item.isVisible()) {
          count++;
        }
      });
      return count;
    })();
  }

  async select(name) {
    const entries = await this.el.$$('#recentDocumentsList .list-item-title');
    const entriesTitle = await this.el.$$('#recentDocumentsList .list-item-title').map((img) => img.getText());
    const index = entriesTitle.findIndex((currenTitle) => currenTitle.trim() === name);
    if (index !== -1) {
      await entries[index].click();
      return true;
    }
    return false;
  }

  async waitForHasMember(title, reverse) {
    await driver.pause(2000);
    const result = await (async () => {
      const ele = await this.el;
      const entriesTitle = await ele.$$('#recentDocumentsList .list-item-title').map((img) => img.getText());
      const index = await entriesTitle.findIndex((currenTitle) => currenTitle.trim() === title);
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
}
