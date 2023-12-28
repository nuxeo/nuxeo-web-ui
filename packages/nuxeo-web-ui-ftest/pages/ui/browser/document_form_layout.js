import BasePage from '../../base';
import DocumentLayout from './document_layout';

export default class DocumentFormLayout extends BasePage {
  constructor(selector, docType, layout) {
    super(selector);
    this._docType = docType;
    this._layout = layout;
  }

  set title(title) {
    return (async () => {
      const inputEle = await this.el.element('.input-element input');
      const setEle = await inputEle.setValue(title);
      return setEle;
    })();
  }

  get layout() {
    return new DocumentLayout(`nuxeo-${this._docType.toLowerCase()}-${this._layout}-layout`);
  }

  get errorMessages() {
    return this.el.elements('#error .error').map((errorElt) => errorElt.getText());
  }

  async save() {
    const button = await this.el.$('.actions #save');
    button.waitForVisible();
    button.click();
  }
}
