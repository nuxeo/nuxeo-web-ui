'use strict';

import BasePage from '../base';

export default class Selection extends BasePage {

  addToClipboard() {
    this.el.element('nuxeo-clipboard-documents-button').click();
    this.waitForNotVisible();
  }

  moveDown() {
    this.el.waitForVisible('nuxeo-move-documents-down-button');
    this.el.element('nuxeo-move-documents-down-button').click();
  }

  moveUp() {
    this.el.waitForVisible('nuxeo-move-documents-up-button');
    this.el.element('nuxeo-move-documents-up-button').click();
  }
}
