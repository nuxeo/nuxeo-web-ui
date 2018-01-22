'use strict';

import BasePage from '../base';

export default class Selection extends BasePage {

  addToClipboard() {
    this.el.element('nuxeo-clipboard-documents-button').click();
    this.waitForNotVisible();
  }
}
