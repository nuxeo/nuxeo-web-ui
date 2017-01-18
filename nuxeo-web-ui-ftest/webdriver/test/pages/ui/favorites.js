'use strict';

export default class Favorites {

  constructor(selector) {
    driver.waitForVisible(selector);
    this.page = driver.element(selector);
  }

  hasDocument(doc) {
    let favorites = this.page.elements(`#favoritesList #items div`).value;
    return favorites.some((favorite) => favorite.isExisting(`span.list-item-title`) && favorite.getText(`span.list-item-title`).trim() === doc.title);
  }

  removeDocument(doc) {
    let favorites = this.page.elements(`#favoritesList #items div`).value;
    return favorites.some((favorite) => {
      if (favorite.getText(`span.list-item-title`).trim() === doc.title) {
        favorite.element(`iron-icon.remove`).click();
        driver.waitUntil(function() {
          return !this.hasDocument(doc);
        }.bind(this));
        return true;
      } else {
        return false;
      }
    });
  }

}
