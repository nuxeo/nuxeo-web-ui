import BasePage from '../base';

export default class HistoryTable extends BasePage {
  getHistory(event) {
    return this.el.element(`///*[text()="${event}"]`);
  }
}
