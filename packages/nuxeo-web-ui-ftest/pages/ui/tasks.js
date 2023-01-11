import BasePage from '../base';

export default class Tasks extends BasePage {
  get nbItems() {
    const items = this.el.$$('#list .list-item');
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  get dashboardLink() {
    return this.el.$('.tasks-dashboard #link');
  }
}
