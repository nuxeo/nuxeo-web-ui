'use strict';

import BasePage from '../base'

export default class DocumentVersions extends BasePage {

  get createVersionButton() {
    return this.el.element('nuxeo-document-create-version');
  }

  get dialog() {
    return this.el.element('nuxeo-document-create-version #dialog');
  }

  checkDialogVersion(type, value) {
    switch (type) {
      case 'minor':
        return this._equalValue('#nextMinor', value);
      case 'major':
        return this._equalValue('#nextMajor', value);
    }
  }

  checkDialogButtons() {
    let dismiss = this.dialog.element('paper-button[dialog-dismiss]');
    let confirm = this.dialog.element('paper-button[dialog-confirm]');
    console.log(dismiss.isVisible() && confirm.isVisible());
    return dismiss.isVisible() && confirm.isVisible();
  }

  _equalValue(selector, value) {
    return this.el.element(selector).getText().should.equal(value);
  }

}