import BasePage from '../base.js';

export default class Home extends BasePage {
  async card(contentId) {
    const cardEle = await this.el.element(`#${contentId}`);
    return cardEle;
  }
}
