import BasePage from '../base';

export default class ParentInspector extends BasePage {
  get dialog() {
    return this.el.element('#dialog');
  }

  get title() {
    return this.el.element('.table tbody tr:nth-child(1) td:nth-child(2)');
  }

  get path() {
    return this.el.element('.table tbody tr:nth-child(2) td:nth-child(2)');
  }

  get uid() {
    return this.el.element('.table tbody tr:nth-child(3) td:nth-child(2)');
  }

  get facets() {
    return this.el.element('.facets');
  }

  get schema() {
    return this.el.element('.schemas');
  }

  get parentInspectorClose() {
    return this.el.element('.actions paper-button');
  }
}
