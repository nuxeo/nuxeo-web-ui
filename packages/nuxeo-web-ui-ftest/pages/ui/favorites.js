/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class Favorites extends BasePage {
  async hasDocument(doc) {
    await this.waitForVisible();
    const titleTextEle = await this._hasDocument(doc, this.el);
    return titleTextEle;
  }

  async removeDocument(doc) {
    await this.waitForVisible();
    const favorites = await this.el.elements('#favoritesList');
    for (let i = 0; i < favorites.length; i++) {
      const favorite = favorites[i];
      const hasDocumentEle = await this._hasDocument(doc, this.el);
      if (hasDocumentEle) {
        favorite.$('iron-icon.remove').click();
        driver.waitUntil(() => !hasDocumentEle);
        return true;
      }
      return false;
    }
  }

  // prevent usage of this.el inside waitUntil
  async _hasDocument(doc, el) {
    const favorites = await el.$$('.list-item');
    for (let i = 0; i < favorites.length; i++) {
      const favorite = favorites[i];
      const title = await favorite.$('.list-item-title');
      const isVisible = await title.isVisible();
      const text = await title.getText();
      return isVisible && text.trim() === doc.title;
    }
  }
}
