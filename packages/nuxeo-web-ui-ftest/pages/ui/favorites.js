import BasePage from '../base';

export default class Favorites extends BasePage {
  hasDocument(doc) {
    this.waitForVisible();
    return this._hasDocument(doc, this.el);
  }

  removeDocument(doc) {
    this.waitForVisible();
    const favorites = this.el.elements('#favoritesList');
    return favorites.some((favorite) => {
      if (this._hasDocument(doc, this.el)) {
        favorite.click('iron-icon.remove');
        driver.waitUntil(() => !this._hasDocument(doc, this.el));
        return true;
      }
      return false;
    });
  }

  // prevent usage of this.el inside waitUntil
  _hasDocument(doc, el) {
    const favorites = el.$$('.list-item');
    return favorites.some((favorite) => {
      const title = favorite.$('.list-item-title');
      return title.isVisible() && title.getText().trim() === doc.title;
    });
  }
}
