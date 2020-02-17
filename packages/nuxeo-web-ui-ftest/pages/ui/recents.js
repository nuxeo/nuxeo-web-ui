import BasePage from '../base';

export default class Recents extends BasePage {
  get nbItems() {
    const items = this.el.elements('#recentDocumentsList .list-item').value;
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  select(name) {
    const entries = this.el.elements('#recentDocumentsList .list-item-title').value;
    const doc = entries.find((entry) => entry.getText().trim() === name);
    if (doc) {
      doc.click();
      return true;
    }
    return false;
  }

  waitForHasMember(title, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const members = el.elements('#recentDocumentsList .list-item-title').value;
        if (reverse) {
          return members.every((member) => member.getText().trim() !== title);
        }
        return members.some((member) => member.getText().trim() === title);
      },
      reverse
        ? 'There is such member in the recently viewed list'
        : 'There is no such member in the recently viewed list',
    );
    return true;
  }
}
