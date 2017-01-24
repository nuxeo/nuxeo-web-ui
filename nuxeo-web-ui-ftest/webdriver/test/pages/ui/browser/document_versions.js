'use strict';

import BasePage from '../../base'

export default class DocumentVersions extends BasePage {

  get createVersionButton() {
    return this.el.element('nuxeo-document-create-version');
  }

  get dialog() {
    return this.el.element('nuxeo-document-create-version #dialog');
  }

  get dialogMajorOption() {
    return this.dialog.element('paper-radio-button[name="major"]');
  }

  get dialogMinorOption() {
    return this.dialog.element('paper-radio-button[name="minor"]');
  }

  get dialogNextMajor() {
    return this.el.element('#nextMajor');
  }

  get dialogNextMinor() {
    return this.el.element('#nextMinor');
  }

  get dialogDismissButton() {
    return this.dialog.element('paper-button[dialog-dismiss]');
  }

  get dialogConfirmButton() {
    return this.dialog.element('paper-button[dialog-confirm]');
  }

  get listToggle() {
    return this.el.element('nuxeo-tag.toggle');
  }

  listLatest() {
    return this.el.element('nuxeo-document-versions-list #version-latest');
  }

  listItemTitle(index) {
    return this.el.element('nuxeo-document-versions-list #version-id-' + index + ' .title');
  }

}