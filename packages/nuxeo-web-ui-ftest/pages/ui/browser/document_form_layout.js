/* eslint-disable no-await-in-loop */
import BasePage from '../../base';
import DocumentLayout from './document_layout';

export default class DocumentFormLayout extends BasePage {
  constructor(selector, docType, layout) {
    super(selector);
    this._docType = docType;
    this._layout = layout;
  }

  set title(title) {
    return this.el.$('.input-element input').setValue(title);
  }

  get layout() {
    return new DocumentLayout(`nuxeo-${this._docType.toLowerCase()}-${this._layout}-layout`);
  }

  get errorMessages() {
    return (async () => {
      const errorElements = await this.el.elements('#error .error');
      const errorTexts = [];
      for (let i = 0; i < errorElements.length; i++) {
        const errorElement = errorElements[i];
        const errorText = await errorElement.getText();
        errorTexts.push(errorText);
      }
      return errorTexts;
    })();
  }

  async save() {
    const button = await this.el.element('.actions #save');
    await button.waitForVisible();
    await button.click();
  }
}
