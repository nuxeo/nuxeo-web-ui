import BasePage from '../base';

export default class Home extends BasePage {
  card(contentId) {
    return this.el.element(`#${contentId}`);
  }
}
