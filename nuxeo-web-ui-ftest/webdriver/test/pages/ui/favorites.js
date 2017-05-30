'use strict';

import BasePage from '../base';

export default class Favorites extends BasePage {

  hasDocument(doc) {
    this.waitForVisible();
    return this._hasDocument(doc, this.el);
  }

  removeDocument(doc) {
    this.waitForVisible();
    const favorites = this.el.elements(`#favoritesList #items div`).value;
    return favorites.some((favorite) => {
      if (favorite.getText(`span.list-item-title`).trim() === doc.title) {
        favorite.element(`iron-icon.remove`).click();
        const el = this.el;
        driver.waitUntil(() => !this._hasDocument(doc, el));
        return true;
      } else {
        return false;
      }
    });
  }

  // prevent usage of this.el inside waitUntil
  _hasDocument(doc, el) {
    const favorites = el.elements(`#favoritesList #items div`).value;
    return favorites.some((favorite) =>
        favorite.isExisting(`span.list-item-title`) && favorite.getText(`span.list-item-title`).trim() === doc.title
    );
  }

}
