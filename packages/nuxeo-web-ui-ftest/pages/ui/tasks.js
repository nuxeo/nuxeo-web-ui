import BasePage from '../base';

export default class Tasks extends BasePage {
  get nbItems() {
    return (async () => {
      await driver.pause(2000);
      const items = await this.el.$$('#list .list-item');
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const item = await items[i].isVisible();
        if (item) {
          count++;
        }
      }
      return count;
    })();
  }

  get dashboardLink() {
    return this.el.element('.tasks-dashboard #link');
  }
}
