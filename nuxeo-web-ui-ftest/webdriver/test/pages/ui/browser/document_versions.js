'use strict';

import BasePage from '../base'

export default class DocumentVersions extends BasePage {

  get createVersionButton() {
    return this.el.element('nuxeo-document-create-version');
  }

  get dialog() {
    return this.el.element('nuxeo-document-create-version #dialog');
  }

  dialogNextMajor() {
    return this.el.element('#nextMajor').getText();
  }

  dialogNextMinor() {
    return this.el.element('#nextMinor').getText();
  }

  dialogDismissButton() {
    return this.dialog.element('paper-button[dialog-dismiss]');
  }

  dialogConfirmButton() {
    return this.dialog.element('paper-button[dialog-confirm]');
  }

}